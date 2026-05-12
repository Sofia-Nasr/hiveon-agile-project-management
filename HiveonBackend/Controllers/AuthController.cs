using Google.Apis.Auth;
using HiveonBackend.Data;
using HiveonBackend.DTOs;
using HiveonBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace HiveonBackend.Controllers
{
    // DTO for Google token response
    public class GoogleTokenResponse
    {
        public string access_token { get; set; }
        public string id_token { get; set; }
        public string token_type { get; set; }
        public int expires_in { get; set; }
        public string refresh_token { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly PasswordHasher<User> _hasher = new();

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        // ======================================================
        // POST: /api/auth/register
        // ClickUp-style: user registers, then MUST create/join workspace.
        // ======================================================
        [HttpPost("register")]
        [AllowAnonymous]
        public IActionResult Register([FromBody] UserRegisterDto dto)
        {
            if (dto is null) return BadRequest("Invalid payload.");
            if (string.IsNullOrWhiteSpace(dto.Email) ||
                string.IsNullOrWhiteSpace(dto.Username) ||
                string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("Username, Email and Password are required.");

            if (_context.Users.Any(u => u.Email == dto.Email))
                return BadRequest("Email already exists.");

            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = dto.Username.Trim(),
                Email = dto.Email.Trim(),
                PasswordHash = ""
                
            };

            user.PasswordHash = _hasher.HashPassword(user, dto.Password);

            _context.Users.Add(user);
            _context.SaveChanges();

            // User has NO workspace yet → Pending
            return Ok(BuildAuthResponse(user, "Pending"));
        }

        // ======================================================
        // GET: /api/auth/google
        // ======================================================
        [HttpGet("google")]
        [AllowAnonymous]
        public IActionResult GoogleLogin()
        {
            var clientId = _config["Google:ClientId"];
            var redirectUri = _config["Google:LoginRedirectUri"];
            var scope = "openid email profile https://www.googleapis.com/auth/calendar.events";

            var url = "https://accounts.google.com/o/oauth2/v2/auth" +
    "?response_type=code" +
    "&client_id=" + Uri.EscapeDataString(clientId) +
    "&redirect_uri=" + Uri.EscapeDataString(redirectUri) +
    "&scope=" + Uri.EscapeDataString(scope) +
    "&access_type=offline" +
    "&prompt=consent";

            return Redirect(url);
        }

        // ======================================================
        // GET: /api/auth/google/callback
        // ClickUp-style: do NOT auto-create workspace.
        // ======================================================
        [HttpGet("google/callback")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleCallback(
    [FromQuery] string? code,
    [FromQuery] string? error = null)
        {
            if (!string.IsNullOrEmpty(error))
                return BadRequest("Google login error: " + error);

            if (string.IsNullOrWhiteSpace(code))
                return BadRequest("Missing code from Google.");

            var clientId = _config["Google:ClientId"];
            var clientSecret = _config["Google:ClientSecret"];
            var redirectUri = _config["Google:LoginRedirectUri"];

            using var http = new HttpClient();

            var tokenRequest = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"] = redirectUri,
                ["grant_type"] = "authorization_code"
            });

            var tokenResponse = await http.PostAsync(
                "https://oauth2.googleapis.com/token",
                tokenRequest);

            if (!tokenResponse.IsSuccessStatusCode)
            {
                var errText = await tokenResponse.Content.ReadAsStringAsync();
                return BadRequest("Failed to exchange code: " + errText);
            }

            var json = await tokenResponse.Content.ReadAsStringAsync();
            var googleTokens = JsonSerializer.Deserialize<GoogleTokenResponse>(json);

            if (string.IsNullOrEmpty(googleTokens?.id_token))
                return BadRequest("No id_token from Google.");

            var payload = await GoogleJsonWebSignature.ValidateAsync(
                googleTokens.id_token,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { clientId }
                });

            var email = payload.Email;
            var name = payload.Name ?? email;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Username = name,
                    Email = email,
                    PasswordHash = "" // Google users have no password
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }
            // Save Google tokens for calendar / meet creation
            var connection = await _context.GoogleConnections
      .FirstOrDefaultAsync(g => g.UserId == user.Id);

            if (connection == null)
            {
                connection = new GoogleConnection
                {
                    UserId = user.Id,
                    AccessToken = googleTokens.access_token,
                    RefreshToken = googleTokens.refresh_token,
                    ExpiresAt = DateTime.UtcNow.AddSeconds(googleTokens.expires_in)
                };

                _context.GoogleConnections.Add(connection);
            }
            else
            {
                connection.AccessToken = googleTokens.access_token;
                connection.RefreshToken = googleTokens.refresh_token;
                connection.ExpiresAt = DateTime.UtcNow.AddSeconds(googleTokens.expires_in);
            }

            await _context.SaveChangesAsync();

            // 🔑 ROLE IS ALWAYS PENDING HERE
            var roleName = "Pending";

            var authPayload = BuildAuthResponse(user, roleName);

            var frontendRedirect = _config["Frontend:OAuthRedirectUrl"];

            var token = (string)authPayload["token"];
            var requiresWorkspace = (bool)authPayload["requiresWorkspace"];
            var activeWorkspaceId = authPayload["activeWorkspaceId"]?.ToString() ?? "";

            var url =
                $"{frontendRedirect}?token={Uri.EscapeDataString(token)}" +
                $"&requiresWorkspace={(requiresWorkspace ? "true" : "false")}" +
                $"&activeWorkspaceId={Uri.EscapeDataString(activeWorkspaceId)}";

            return Redirect(url);
        }


        // ======================================================
        // POST: /api/auth/complete-profile
        // ======================================================
        [HttpPost("complete-profile")]
        [Authorize]
        public IActionResult CompleteProfile([FromBody] CompleteProfileDto dto)
        {
            if (dto == null) return BadRequest("Invalid payload.");
            if (string.IsNullOrWhiteSpace(dto.Username))
                return BadRequest("Username is required.");

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized("Invalid user.");

            var user = _context.Users.FirstOrDefault(u => u.Id == userId);
            if (user == null)
                return NotFound("User not found.");

            user.Username = dto.Username.Trim();
            _context.SaveChanges();

            // 🔑 STILL NO ROLE — user must select / join workspace
            return Ok(BuildAuthResponse(user, "Pending"));
        }

        // ======================================================
        // POST: /api/auth/login
        // ======================================================
        [HttpPost("login")]
        [AllowAnonymous]
        public IActionResult Login([FromBody] UserLoginDto dto)
        {
            if (dto is null) return BadRequest("Invalid payload.");

            var user = _context.Users.FirstOrDefault(u => u.Email == dto.Email);
            if (user == null)
                return Unauthorized("Invalid email or password.");

            var verify = _hasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                dto.Password);

            if (verify == PasswordVerificationResult.Failed)
                return Unauthorized("Invalid email or password.");

            // 🔑 Role is pending until workspace selection
            return Ok(BuildAuthResponse(user, "Pending"));
        }


        // ======================================================
        // GET: /api/auth/workspaces
        // Used by frontend after login/google redirect when user has multiple workspaces.
        // ======================================================
        [HttpGet("workspaces")]
        [Authorize]
        public async Task<IActionResult> GetMyWorkspaces()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized("Invalid user.");

            var workspaces = await _context.WorkspaceUsers
     .Where(wu => wu.UserId == userId)
     .Select(wu => new
     {
         id = wu.Workspace.Id,
         name = wu.Workspace.Name,
         role = wu.Role
     })
     .ToListAsync();

            return Ok(workspaces);
        }

        // ======================================================
        // Builds the auth response with ClickUp-style workspace selection rules.
        // ======================================================
        private Dictionary<string, object> BuildAuthResponse(User user, string roleName)
        {
            // Load memberships (WorkspaceUser join table)
            var workspaceList = _context.WorkspaceUsers
                .Where(wu => wu.UserId == user.Id)
                .Select(wu => wu.Workspace)
                .Select(w => new { id = w.Id, name = w.Name })
                .ToList();

            Guid? activeWorkspaceId = null;
            bool requiresWorkspace = workspaceList.Count == 0;

            if (workspaceList.Count == 1)
            {
                // auto-select when exactly one
                activeWorkspaceId = (Guid)workspaceList[0].id;
            }

            // JWT includes workspaceId claim ONLY if we actually have an active workspace
            var token = GenerateJwt(user, roleName, activeWorkspaceId);

            return new Dictionary<string, object>
            {
                ["token"] = token,
                ["requiresWorkspace"] = requiresWorkspace,
                ["activeWorkspaceId"] = activeWorkspaceId,
                ["workspaces"] = workspaceList,
                ["user"] = new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    role = roleName
                }
            };
        }

   
        // ======================================================
        // JWT GENERATOR (workspaceId claim is OPTIONAL now)
        // ======================================================
        private string GenerateJwt(User user, string roleName, Guid? workspaceId)
        {
            var jwt = _config.GetSection("Jwt");
            var key = jwt["Key"];

            var signingKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(key));

            var creds = new SigningCredentials(
                signingKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Name, user.Username),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.Role, roleName)
    };

            // Only include workspaceId if one is active
            if (workspaceId.HasValue)
            {
                claims.Add(new Claim("workspaceId", workspaceId.Value.ToString()));
            }

            var token = new JwtSecurityToken(
                issuer: jwt["Issuer"],
                audience: jwt["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(
                    double.TryParse(jwt["ExpireMinutes"], out var m) ? m : 60),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }


        [HttpPost("switch-workspace")]
        [Authorize]
        public IActionResult SwitchWorkspace([FromBody] Guid workspaceId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var membership = _context.WorkspaceUsers
                .Include(wu => wu.Workspace)
                .FirstOrDefault(wu =>
                    wu.UserId == userId &&
                    wu.WorkspaceId == workspaceId);

            if (membership == null)
                return Forbid("User is not part of this workspace.");

            var user = _context.Users.Find(userId);
            if (user == null)
                return Unauthorized();

            var roleName = membership.Role; // ✅ ScrumMaster / Developer / ProductOwner

            var token = GenerateJwt(user, roleName, workspaceId);

            return Ok(new
            {
                token,
                workspaceId,
                role = roleName
            });
        }


    }
}
