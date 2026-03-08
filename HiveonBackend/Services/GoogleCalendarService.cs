using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Google.Apis.Auth.OAuth2;

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
            var credential = GoogleCredential.FromAccessToken(accessToken);

            var service = new CalendarService(new BaseClientService.Initializer()
            {
                HttpClientInitializer = credential,
                ApplicationName = "Hiveon"
            });

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

                Attendees = attendeeEmails
                    .Select(e => new EventAttendee { Email = e })
                    .ToList(),

                ConferenceData = new ConferenceData
                {
                    CreateRequest = new CreateConferenceRequest
                    {
                        RequestId = Guid.NewGuid().ToString(),
                        ConferenceSolutionKey = new ConferenceSolutionKey
                        {
                            Type = "hangoutsMeet"
                        }
                    }
                }
            };

            var request = service.Events.Insert(calendarEvent, "primary");
            request.ConferenceDataVersion = 1;

            // 🔹 this sends email invites automatically
            request.SendUpdates = EventsResource.InsertRequest.SendUpdatesEnum.All;

            var createdEvent = await request.ExecuteAsync();

            return createdEvent.HangoutLink;
        }
    }
}