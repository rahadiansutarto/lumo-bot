# Example Usage Scenarios

This document shows real-world examples of how your team will use the bot.

## Calendar Management

### Scenario 1: Check Today's Schedule

**Sarah in Slack:**
```
Sarah: @bot Do I have any meetings today?

Bot: Found 3 events:

📅 Morning Standup
   Time: Jan 20, 2024, 9:00 AM (15 minutes)
   Location: Zoom
   Attendees: engineering@company.com
   Link: https://zoom.us/j/123456

📅 Product Review
   Time: Jan 20, 2024, 2:00 PM (60 minutes)
   Location: Conference Room B
   Attendees: sarah@company.com, mike@company.com, lisa@company.com
   Description: Review Q1 roadmap priorities

📅 1:1 with Manager
   Time: Jan 20, 2024, 4:30 PM (30 minutes)
   Attendees: sarah@company.com, manager@company.com
```

### Scenario 2: Create a Meeting

**John in DM:**
```
John: Create a meeting tomorrow at 2pm for 1 hour titled "Budget Review" 
      with finance@company.com and ceo@company.com

Bot: ✓ Event created successfully!

📅 Budget Review
   Time: Jan 21, 2024, 2:00 PM (60 minutes)
   Attendees: finance@company.com, ceo@company.com
   Link: https://calendar.google.com/event?eid=...
```

### Scenario 3: Check Availability

**Manager in channel:**
```
Manager: @bot What meetings do I have next week?

Bot: Found 8 events for Jan 22-26, 2024:

Monday, Jan 22:
📅 Team Standup (9:00 AM, 15 min)
📅 Client Call - Acme Corp (10:00 AM, 60 min)
📅 Lunch with Engineering (12:00 PM, 60 min)

Tuesday, Jan 23:
📅 All Hands Meeting (9:30 AM, 60 min)
📅 Sprint Planning (2:00 PM, 120 min)

Wednesday, Jan 24:
📅 1:1s (9:00 AM - 4:00 PM, 8 meetings)

[... continues ...]
```

## Multi-Tool Workflows

### Scenario 4: Weather + Calendar

**User:**
```
User: @bot What's the weather in San Francisco tomorrow? 
      I have an outdoor client meeting.

Bot: Weather for San Francisco tomorrow (Jan 21):
     • Partly cloudy
     • Temp: 18°C (feels like 16°C)
     • Good conditions for outdoor meeting!
     
     Your meetings tomorrow:
     📅 Client Lunch - Outdoor Patio
        Time: 12:00 PM (90 minutes)
        Location: Ferry Building
```

### Scenario 5: CRM + Calendar

**Sales Rep:**
```
Rep: @bot When is my next meeting with Acme Corp?

Bot: Next Acme Corp meeting:

📅 Quarterly Business Review - Acme Corp
   Time: Jan 25, 2024, 3:00 PM (60 minutes)
   Attendees: john@acmecorp.com, sarah@acmecorp.com, you
   
📊 Acme Corp (from Attio):
   • Status: Active customer
   • ARR: $120,000
   • Last interaction: Jan 15, 2024
   • Account owner: You
   • Notes: Interested in Enterprise plan upgrade
```

## First-Time User Flow

### New Employee Setup

**Day 1 - Lisa joins the team:**

```
Lisa: @bot hello!

Bot: Hi Lisa! I'm your company assistant. I can help with:
     • 📅 Your Google Calendar (meetings, scheduling)
     • 🔍 Searching company docs
     • 👥 Customer information (Attio CRM)
     • 🌤️ Weather forecasts
     
     To get started with calendar features, connect your Google Calendar:
     Type `/connect-calendar` to authorize.

Lisa: /connect-calendar

Bot: 📅 Connect Your Google Calendar
     
     Click the link below to authorize calendar access:
     https://accounts.google.com/o/oauth2/auth?...
     
     After authorizing, you can ask questions like "Do I have any 
     meetings today?" or "Create a meeting tomorrow at 2pm"

[Lisa clicks link, signs in with lisa@company.com, grants permissions]

Lisa: Do I have any meetings today?

Bot: Found 2 events:

📅 New Hire Orientation
   Time: Today, 10:00 AM (120 minutes)
   Location: Conference Room A
   Attendees: hr@company.com, 5 other new hires

📅 IT Setup Session
   Time: Today, 2:00 PM (30 minutes)
   Attendees: it@company.com, lisa@company.com
```

## Privacy & Security Examples

### Different Users, Different Calendars

**In #engineering channel:**

```
Sarah: @bot Do I have any meetings today?
Bot: Found 3 events:
     📅 Engineering Standup (9:00 AM)
     📅 Code Review (2:00 PM)
     📅 Team Social (5:00 PM)

Mike: @bot Do I have any meetings today?
Bot: Found 2 events:
     📅 Engineering Standup (9:00 AM)
     📅 Dentist Appointment (11:00 AM)
```

Notice: Each person sees only their own calendar, even in the same channel.

### Email Domain Restriction

**User tries with personal email:**

```
User: /connect-calendar
[Clicks link, tries to sign in with john@gmail.com]

Google OAuth: ❌ Authorization Failed
              Only @company.com email addresses are allowed. 
              You attempted to use: john@gmail.com

[User tries again with john@company.com]

Google OAuth: ✅ Calendar Connected!
              Successfully connected your Google Calendar 
              (john@company.com)
```

## Complex Queries

### Natural Language Understanding

The bot understands various ways to ask:

```
✓ "Do I have any meetings today?"
✓ "What's on my calendar?"
✓ "Am I free at 3pm tomorrow?"
✓ "When is my next 1:1?"
✓ "Show me this week's schedule"
✓ "What meetings do I have with John?"
✓ "Create a 30 min meeting at 2pm tomorrow with sarah@company.com"
✓ "Schedule a team sync next Monday morning"
```

### Search Within Calendar

```
User: @bot Find all meetings about "budget"

Bot: Found 4 events matching "budget":

📅 Budget Review Q1
   Time: Jan 25, 2:00 PM
   
📅 Marketing Budget Planning
   Time: Jan 28, 10:00 AM
   
📅 Annual Budget Presentation
   Time: Feb 1, 9:00 AM
   
📅 Budget Cuts Discussion
   Time: Feb 5, 3:00 PM
```

## Error Handling

### Graceful Failures

```
User: @bot Create a meeting yesterday at 2pm

Bot: I couldn't create that event. The start time appears to be in the 
     past. Meetings must be scheduled for future dates.
     
     Try: "Create a meeting tomorrow at 2pm"

---

User: @bot Show my calendar

Bot: Your calendar request failed. This usually happens when your 
     authorization has expired. Please reconnect your calendar:
     
     /connect-calendar
```

## Advanced Features

### Meeting Conflicts

```
User: @bot Create a meeting tomorrow at 2pm with team@company.com

Bot: ⚠️ Potential conflict detected!
     
     You already have:
     📅 Client Call
        Time: Tomorrow 2:00 PM - 3:00 PM
     
     Would you like to:
     1. Schedule anyway (you'll have overlapping meetings)
     2. Try a different time
     
     [For now, I'll create the meeting as requested]
     
     ✓ Event created: Team Meeting (Tomorrow 2:00 PM)
```

## Tips for Users

### Best Practices

**Good queries:**
```
✓ "Do I have any meetings today?"
✓ "What's my schedule tomorrow?"
✓ "Create a 1-hour meeting at 2pm with john@company.com titled Sprint Planning"
```

**Less specific (but still works):**
```
~ "meetings?"
~ "calendar"
~ "schedule something tomorrow"
```

### Slash Commands

```
/connect-calendar  → Get your Google Calendar authorization link
/forecast Tokyo    → Check weather (works without calendar)
```

### Privacy Note

- ✅ Only you see your calendar events
- ✅ Bot cannot see other users' calendars
- ✅ Your data stays in your Google account
- ✅ You can revoke access anytime via Google settings
