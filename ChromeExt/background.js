chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("📩 [Background] Received request:", request);

    if (request.action === "fetchCalendars") {
        console.log("✅ [Background] Handling fetchCalendars request.");
        fetchCalendars(sendResponse);
        return true; // Keep message port open
    }

    if (request.action === "fetchEvents") {
        console.log("✅ [Background] Handling fetchEvents request.");
        fetchEvents(request, sendResponse);
        return true; // Keep message port open
    }
});

function fetchCalendars(sendResponse) {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
        if (chrome.runtime.lastError || !token) {
            console.error("❌ [Background] Failed to retrieve auth token.", chrome.runtime.lastError);
            sendResponse({ error: "Authentication failed." });
            return;
        }

        fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(data => {
            console.log("📊 [Background] Raw Calendar List API Response:", data);

            if (!data.items) {
                console.warn("⚠️ [Background] No calendars found.");
                sendResponse({ error: "No calendars found." });
                return;
            }

            sendResponse({ calendarList: data.items });
        })
        .catch(error => {
            console.error("❌ [Background] Error fetching calendars:", error);
            sendResponse({ error: "Failed to fetch calendars." });
        });
    });
}

function fetchEvents(request, sendResponse) {
    const { calendars, startDate, endDate } = request;

    chrome.identity.getAuthToken({ interactive: true }, function (token) {
        if (chrome.runtime.lastError || !token) {
            console.error("❌ [Background] Failed to retrieve auth token.", chrome.runtime.lastError);
            sendResponse({ error: "Authentication failed." });
            return;
        }

        let allEvents = [];
        let pendingRequests = calendars.length;

        calendars.forEach(calendarId => {
            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${startDate}T00:00:00Z&timeMax=${endDate}T23:59:59Z&singleEvents=true&orderBy=startTime`;

            fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then(response => response.json())
            .then(data => {
                console.log(`📊 [Background] Raw API Response for ${calendarId}:`, data);

                if (!data.items || data.items.length === 0) {
                    console.warn(`⚠️ [Background] No events found for calendar: ${calendarId}`);
                } else {
                    data.items.forEach(event => {
                        console.log(`🕒 Event: ${event.summary || "Unnamed Event"}`);
                        console.log("🔹 Start:", event.start);
                        console.log("🔹 End:", event.end);
                    });

                    // Filter out events missing start or end time (ignore all-day events)
                    const filteredEvents = data.items.filter(event =>
                        event.start?.dateTime && event.end?.dateTime
                    ).map(event => ({
                        calendarId: calendarId,
                        summary: event.summary || "Unnamed Event",
                        start: event.start,
                        end: event.end
                    }));

                    allEvents = allEvents.concat(filteredEvents);
                }

                pendingRequests--;
                if (pendingRequests === 0) {
                    console.log("✅ [Background] Sending final event list to popup:", allEvents);
                    sendResponse({ events: allEvents });
                }
            })
            .catch(error => {
                console.error(`❌ [Background] Error fetching events for ${calendarId}:`, error);
                pendingRequests--;
                if (pendingRequests === 0) {
                    sendResponse({ error: "Failed to fetch events." });
                }
            });
        });
    });
}
