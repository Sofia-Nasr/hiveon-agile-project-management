using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HiveonBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddTargetForSprintToUserStory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TargetForSprint",
                table: "UserStories",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TargetForSprint",
                table: "UserStories");
        }
    }
}
