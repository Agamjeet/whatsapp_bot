import ical from "node-ical";
import fetch from "node-fetch";
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import fs from "fs";

// const CALENDAR_URL = "https://p155-caldav.icloud.com/published/2/ODMwMjgxMTIxODMwMjgxMV1RMGDKLWDxbXoVzt3ZSShrqZ0a_LoUqtW6YoAKGeXo"; // <-- Replace with your iCloud public .ics URL

const CALENDAR_URL = "webcal://p180-caldav.icloud.com/published/2/MjExNTY0MjE3MzIyMTE1Nm7Eqe-UNVzUFg3WAk2YWf8qNmbKhwXY03xEDdr-fi2C2X1Q3V3kmmxte1LfD5BMea5F2z_RucvfIP796qJw-VU"
const ADMIN_PHONE = ""; //add your phone number

// Configuration
const CONFIG = {
  sendImmediately:false, // Set to true to send reminders immediately, false for 12-hour window
  notificationWindow: 12 // Hours before event to send reminder
};

const SENT_FILE = "sent.json"; // Store sent event IDs to avoid duplicates

// Store responses
const RESPONSES_FILE = "responses.json";

// Store event information for responses
const eventResponses = new Map();

// Load already-sent event IDs
function loadSentEvents() {
  try {
    if (!fs.existsSync(SENT_FILE)) return {};
    return JSON.parse(fs.readFileSync(SENT_FILE));
  } catch (error) {
    console.error('Error loading sent events:', error);
    return {};
  }
}

// Save sent event IDs
function saveSentEvents(data) {
  try {
    fs.writeFileSync(SENT_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving sent events:', error);
  }
}

// Check if event was already sent
function wasSent(id, sentEvents) {
  return sentEvents[id];
}

// Add event to sent log
function markAsSent(id, sentEvents) {
  sentEvents[id] = true;
  saveSentEvents(sentEvents);
}

// Load responses
function loadResponses() {
  try {
    if (!fs.existsSync(RESPONSES_FILE)) return {};
    return JSON.parse(fs.readFileSync(RESPONSES_FILE));
  } catch (error) {
    console.error('Error loading responses:', error);
    return {};
  }
}

function saveResponse(eventId, response) {
  try {
    const responses = loadResponses();
    responses[eventId] = {
      response,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(RESPONSES_FILE, JSON.stringify(responses, null, 2));
  } catch (error) {
    console.error('Error saving response:', error);
  }
}

// Function to format date with timezone
function formatDateWithTimezone(date) {
  if (!date) return 'No date';
  
  // Get the timezone from the date object
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Format the date with timezone
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
    timeZone: timezone
  }).format(date);
}

// Function to extract phone number from event
function extractPhoneNumber(event) {
  console.log('\nExtracting phone number for event:', event.summary);
  
  // Try to get phone from ATTENDEE field
  if (event.attendee) {
    console.log('Found ATTENDEE field:', event.attendee);
    const attendee = Array.isArray(event.attendee) ? event.attendee[0] : event.attendee;
    if (attendee && attendee.val) {
      console.log('Attendee value:', attendee.val);
      // Extract phone from mailto: or tel: URI
      const match = attendee.val.match(/tel:(\d+)/);
      if (match) {
        console.log('Found phone in ATTENDEE tel: URI:', match[1]);
        return match[1];
      }
    }
  }

  // Try to get phone from DESCRIPTION or SUMMARY
  const description = event.description || event.summary || '';
  console.log('Looking for phone in description/summary:', description);
  
  // First try to find tel: URI and decode it
  const telMatch = description.match(/tel:([^%]+%20\d+)/);
  if (telMatch) {
    const decodedTel = decodeURIComponent(telMatch[1]);
    console.log('Found and decoded tel: URI:', decodedTel);
    // Extract just the numbers
    const numbers = decodedTel.match(/\d+/g);
    if (numbers) {
      const phoneNumber = numbers.join('');
      console.log('Extracted phone number:', phoneNumber);
      return phoneNumber;
    }
  }
  
  // If no tel: URI found, try direct number match
  const phoneMatch = description.match(/(?:\+|00)?(\d{10,})/);
  if (phoneMatch) {
    console.log('Found phone in description/summary:', phoneMatch[1]);
    return phoneMatch[1];
  }

  console.log('No phone number found in event');
  return null;
}

// Function to check if event is within notification window
function isWithinNotificationWindow(eventStart) {
  if (CONFIG.sendImmediately) {
    return true; // Send immediately if configured
  }

  const now = new Date();
  const eventTime = new Date(eventStart);
  const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60);
  
  console.log(`Event is ${hoursUntilEvent.toFixed(2)} hours away`);
  return hoursUntilEvent >= 0 && hoursUntilEvent <= CONFIG.notificationWindow;
}

// Fetch and parse events
async function getUpcomingEvents() {
  try {
    let calendarUrl = CALENDAR_URL;
    if (calendarUrl.startsWith('webcal://')) {
      calendarUrl = calendarUrl.replace('webcal://', 'https://');
    }

    const res = await fetch(calendarUrl);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const icsData = await res.text();
    const parsed = ical.parseICS(icsData);

    const now = new Date();
    const sentEvents = loadSentEvents();
    const upcomingEvents = [];

    for (const k in parsed) {
      const event = parsed[k];
      if (event.type === "VEVENT" && event.start > now) {
        console.log('\nProcessing event:', event.summary);
        console.log('Event time:', formatDateWithTimezone(event.start));
        
        const eventId = event.uid;
        if (!wasSent(eventId, sentEvents) && isWithinNotificationWindow(event.start)) {
          const phoneNumber = extractPhoneNumber(event);
          if (phoneNumber) {
            upcomingEvents.push({
              id: eventId,
              summary: event.summary || 'No Title',
              start: formatDateWithTimezone(event.start),
              phone: phoneNumber,
            });
          } else {
            console.log(`Warning: No phone number found for event: ${event.summary}`);
          }
        } else if (wasSent(eventId, sentEvents)) {
          console.log(`Event ${event.summary} was already sent`);
        } else {
          console.log(`Event ${event.summary} is not within notification window (0-12 hours)`);
        }
      }
    }

    return { upcomingEvents, sentEvents };
  } catch (error) {
    console.error('Error fetching events:', error);
    return { upcomingEvents: [], sentEvents: loadSentEvents() };
  }
}

// Create WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on("qr", (qr) => {
  console.log("Scan this QR code with WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
  console.log("WhatsApp client is ready!");
  console.log(`Mode: ${CONFIG.sendImmediately ? 'Immediate sending' : `${CONFIG.notificationWindow}-hour window`}`);
  console.log(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  
  try {
    // Get client info
    const info = await client.info;
    console.log("Connected WhatsApp account:", info.pushname);
    console.log("Platform:", info.platform);
    console.log("Phone number:", info.wid._serialized);

    const { upcomingEvents, sentEvents } = await getUpcomingEvents();

    if (upcomingEvents.length === 0) {
      console.log("No new events to send within the next 12 hours.");
      return;
    }

    for (const event of upcomingEvents) {
      try {
        console.log(`\nProcessing event: ${event.summary}`);
        console.log(`Event time: ${event.start}`);
         
        // Check if number exists
        console.log("Checking if number is registered...");
        const numberExists = await client.isRegisteredUser(`${event.phone}@c.us`);
        console.log("Number registered status:", numberExists);
        
        if (!numberExists) {
          console.error(`Phone number ${event.phone} is not registered on WhatsApp!`);
          continue;
        }

        // Store event info for response tracking
        eventResponses.set(event.phone, {
          name: event.summary,
          time: event.start
        });
        
        // Send event reminder
        console.log("Sending event reminder...");
        await client.sendMessage(`${event.phone}@c.us`, 
          `Event: ${event.summary}\n` +
          `Time: ${event.start}\n` +
          `\nPlease reply YES or NO`
        );
        console.log("Reminder sent");
        
        // Send to admin
        console.log("Sending confirmation to admin...");
        await client.sendMessage(`${ADMIN_PHONE}@c.us`, `Sent event to ${event.phone}`);
        console.log("Confirmation sent to admin");
        
        markAsSent(event.id, sentEvents);
      } catch (error) {
        console.error("Error in message sending:", error);
        // Try to notify admin about the error
        try {
          await client.sendMessage(`${ADMIN_PHONE}@c.us`, `Error: ${error.message}`);
        } catch (adminError) {
          console.error("Failed to notify admin about error:", adminError);
        }
      }
    }

    console.log("\nAll events processed. Bot will continue running to listen for responses.");
  } catch (error) {
    console.error("Error in main process:", error);
  }
});

// Listen for responses
client.on('message', async (message) => {
  try {
    const response = message.body.toLowerCase();
    if (response === 'yes' || response === 'no') {
      // Send appropriate response back to the user
      const userResponse = response === 'yes' 
        ? "Thank you for confirming!"
        : "We'll contact you to reschedule a new appointment.";
      
      await client.sendMessage(message.from, userResponse);
      
      // Get event info for this response
      const eventInfo = eventResponses.get(message.from.split('@')[0]);
      const eventName = eventInfo ? eventInfo.name : 'Unknown Event';
      
      // Forward response to admin
      const adminMessage = `📬 ${eventName} ${response === 'yes' ? 'confirmed' : 'declined'} the event!\n\nResponse: ${response.toUpperCase()}\nFrom: ${message.from}`;
      await client.sendMessage(`${ADMIN_PHONE}@c.us`, adminMessage);
      console.log(`Forwarded response to admin: ${response}`);
    }
  } catch (error) {
    console.error('Error processing response:', error);
  }
});

client.on("auth_failure", (error) => {
  console.error("Authentication failed:", error);
  process.exit(1);
});

client.on("disconnected", (reason) => {
  console.error("Client was disconnected:", reason);
  process.exit(1);
});

client.initialize();
