using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Google.Apis.Auth.OAuth2;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HiveonBackend.Services
{
    public class GoogleCalendarService
    {
        public async Task<string> CreateMeetLink(
            string accessToken,
            string title,
            string description,
            DateTime start,
            DateTime end,
            List<string> attendeeEmails
        )
        {
            // ✅ ONLY ONE credential (correct approach)
            var credential = GoogleCredential
                .FromAccessToken(accessToken)
                .CreateScoped(CalendarService.Scope.CalendarEvents);

            var service = new CalendarService(new BaseClientService.Initializer()
            {
                HttpClientInitializer = credential,
                ApplicationName = "Hiveon"
            });

            // 📅 EVENT
            var calendarEvent = new Event
            {
                Summary = title,
                Description = description,

                Start = new EventDateTime
                {
                    DateTime = start,
                    TimeZone = "UTC"
                },

                End = new EventDateTime
                {
                    DateTime = end,
                    TimeZone = "UTC"
                },

                Attendees = attendeeEmails?
                    .Select(e => new EventAttendee { Email = e })
                    .ToList(),

                // 🔥 REQUIRED for Meet generation
                ConferenceData = new ConferenceData
                {
                    CreateRequest = new CreateConferenceRequest
                    {
                        RequestId = Guid.NewGuid().ToString()
                    }
                }
            };

            var request = service.Events.Insert(calendarEvent, "primary");

            request.ConferenceDataVersion = 1;
            request.SendUpdates = EventsResource.InsertRequest.SendUpdatesEnum.All;

            var createdEvent = await request.ExecuteAsync();

            // 🔄 REFRESH (Google sometimes delays Meet generation)
            var fullEvent = await service.Events
                .Get("primary", createdEvent.Id)
                .ExecuteAsync();

            var meetLink = fullEvent.ConferenceData?
                .EntryPoints?
                .FirstOrDefault(e => e.EntryPointType == "video")?
                .Uri;

            if (string.IsNullOrEmpty(meetLink))
            {
                throw new Exception("Google Meet link was not generated. Check OAuth scope or Google account permissions.");
            }

            return meetLink;
        }
    }
}