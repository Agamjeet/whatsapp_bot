# WhatsApp Reminder Bot

A WhatsApp bot that sends event reminders from an iCloud calendar and collects responses.

## Features

- Connects to iCloud calendar via public .ics URL
- Sends event reminders via WhatsApp
- Collects yes/no responses from recipients
- Forwards responses to admin
- Prevents duplicate reminders
- Stores sent events and responses
- Configurable reminder timing (immediate or time window)

## Prerequisites

- Node.js (v16 or higher)
- npm (Node Package Manager)
- A WhatsApp account for the bot
- An iCloud calendar with public sharing enabled
- Admin phone number for notifications

## Installation

1. Clone this repository:
```bash
git clone [repository-url]
cd whatsapp-reminder-bot
```

2. Install dependencies:
```bash
npm install
```

3. Configure the bot:
   - Open `main.js`
   - Update the following variables:
     - `CALENDAR_URL`: Your iCloud calendar public .ics URL
     - `ADMIN_PHONE`: Your admin phone number (with country code, no +)
     - `CONFIG`: Set your preferred reminder timing:
       ```javascript
       const CONFIG = {
         sendImmediately: false, // true for immediate sending, false for time window
         notificationWindow: 12  // hours before event to send reminder
       };
       ```

## Usage

1. Start the bot:
```bash
npm start
```

2. Scan the QR code with WhatsApp on your phone:
   - Open WhatsApp
   - Go to Settings > Linked Devices
   - Scan the QR code shown in the terminal

3. The bot will:
   - Check for upcoming events
   - Send reminders based on your configuration:
     - Immediate mode: Sends reminders as soon as events are found
     - Time window mode: Sends reminders only within the configured window (default 12 hours)
   - Listen for yes/no responses
   - Forward responses to the admin

## Response Handling

- When recipient replies "yes": Bot responds with "Thank you for confirming!"
- When recipient replies "no": Bot responds with "We'll contact you to reschedule a new appointment."
- All responses are forwarded to the admin number with event details

## Configuration Options

### Reminder Timing
```javascript
const CONFIG = {
  sendImmediately: false,  // Set to true for immediate sending
  notificationWindow: 12   // Hours before event to send reminder
};
```

- `sendImmediately`: 
  - `true`: Sends reminders immediately when events are found
  - `false`: Sends reminders only within the notification window
- `notificationWindow`: Number of hours before the event to send the reminder

### Calendar Setup
- Your iCal events should include phone numbers in one of these formats:
  1. In the ATTENDEE field: `ATTENDEE;CN="John Doe":tel:+1234567890`
  2. In the DESCRIPTION: "Meeting with John Doe (1234567890)"
  3. In the SUMMARY: "Meeting with John (1234567890)"

## Files

- `main.js`: Main bot code
- `sent.json`: Tracks sent event reminders
- `responses.json`: Stores collected responses
- `.wwebjs_auth/`: WhatsApp Web authentication data
- `.wwebjs_cache/`: WhatsApp Web cache data

## Troubleshooting

1. If the bot fails to start:
   - Ensure all dependencies are installed
   - Check your Node.js version
   - Verify your calendar URL is accessible

2. If messages aren't sending:
   - Verify the phone numbers are in correct format (with country code, no +)
   - Check your internet connection
   - Ensure WhatsApp Web is properly authenticated

3. If calendar events aren't loading:
   - Verify the calendar URL is correct
   - Check if the calendar is publicly accessible
   - Ensure the calendar has upcoming events
   - Verify phone numbers are in the correct format in your calendar

## Support

For any issues or questions, please contact me