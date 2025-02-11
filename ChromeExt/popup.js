document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ [Popup] Loaded successfully.");
    
    const calendarListContainer = document.getElementById("calendar-list");
    const calculateButton = document.getElementById("calculate");
    const totalHoursSpan = document.getElementById("total-hours");
    const searchBox = document.getElementById("event-search");
    const viewSelect = document.getElementById('view-select');
    const billableSection = document.getElementById('billable-section');

    function fetchCalendars() {
        console.log("🔄 [Popup] Requesting calendars...");
        chrome.runtime.sendMessage({ action: "fetchCalendars" }, function(response) {
            if (!response || response.error) {
                console.error("❌ [Popup] Failed to fetch calendar list:", response?.error || "Unknown error");
                calendarListContainer.innerHTML = "<p class='error-text'>Failed to load calendars.</p>";
                return;
            }

            calendarListContainer.innerHTML = "";

            response.calendarList.forEach(calendar => {
                const row = document.createElement("div");
                row.classList.add("calendar-row", "colored");
                row.style.setProperty("--calendar-color", calendar.backgroundColor || "#e8f0fe");
                row.style.setProperty("--calendar-text-color", calendar.foregroundColor || "#202124");

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.classList.add("calendar-checkbox");
                checkbox.value = calendar.id;
                checkbox.checked = true;

                const name = document.createElement("span");
                name.classList.add("calendar-name");
                name.textContent = calendar.summary;

                const hours = document.createElement("span");
                hours.classList.add("calendar-hours");
                hours.id = `hours-${calendar.id}`;
                hours.textContent = "0 hrs";

                checkbox.addEventListener("change", () => {
                    row.classList.toggle("colored", checkbox.checked);
                });

                row.appendChild(checkbox);
                row.appendChild(name);
                row.appendChild(hours);
                calendarListContainer.appendChild(row);
            });

            console.log("✅ [Popup] Calendars loaded successfully.");
        });
    }

    function fetchEventsForSelectedCalendars() {
        const selectedCalendars = Array.from(document.querySelectorAll(".calendar-checkbox:checked"))
            .map(checkbox => checkbox.value);
        const startDate = document.getElementById("start-date").value;
        const endDate = document.getElementById("end-date").value;

        if (!startDate || !endDate) {
            alert("Please select a start and end date.");
            return;
        }
    
        if (selectedCalendars.length === 0) {
            alert("Please select at least one calendar.");
            return;
        }

        console.log(`📅 Fetching events for calendars: ${selectedCalendars.join(", ")}`);

        chrome.runtime.sendMessage(
            { action: "fetchEvents", calendars: selectedCalendars, startDate, endDate },
            function (response) {
                if (chrome.runtime.lastError) {
                    console.error("❌ [Popup] Message port error:", chrome.runtime.lastError.message);
                    alert("Failed to communicate with the background script.");
                    return;
                }

                if (!response || response.error) {
                    console.error("❌ [Popup] Error fetching events:", response?.error || "Unknown error");
                    alert(`Error fetching events: ${response?.error || "Unknown error"}`);
                    return;
                }

                console.log("📊 Raw events received:", response.events);

                // Log each event's details for debugging
                response.events.forEach(event => {
                    console.log(`🕒 Event: ${event.summary || "Unnamed Event"}`);
                    console.log("🔹 Start:", event.start);
                    console.log("🔹 End:", event.end);
                });

                // Filter out all-day events (single-day & multi-day)
                const filteredEvents = response.events.filter(event => {
                    if (!event.start || !event.end) {
                        console.warn("⚠️ Skipping event due to missing start or end data:", event);
                        return false;
                    }
                    if (event.start.date || event.end.date) {
                        console.log(`❌ Skipping all-day event: ${event.summary || "Unnamed Event"}`, event);
                        return false;
                    }
                    return true; // Keep only timed events
                });

                console.log("✅ Processed timed events:", filteredEvents);

                // Calculate hours per calendar
                const calendarHours = {};
                filteredEvents.forEach(event => {
                    const calendarId = event.calendarId || event.organizer?.email;
                    if (!calendarId) {
                        console.warn("⚠️ Skipping event due to missing calendarId:", event);
                        return;
                    }

                    const startTime = new Date(event.start.dateTime);
                    const endTime = new Date(event.end.dateTime);
                    const durationHours = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours

                    if (!calendarHours[calendarId]) {
                        calendarHours[calendarId] = 0;
                    }
                    calendarHours[calendarId] += durationHours;
                });

                console.log("📊 Calculated hours per calendar:", calendarHours);

                // Update UI for each calendar
                Object.keys(calendarHours).forEach(calendarId => {
                    let hoursElement = document.getElementById(`hours-${calendarId}`);
                    if (!hoursElement) {
                        hoursElement = document.createElement("span");
                        hoursElement.id = `hours-${calendarId}`;
                        hoursElement.classList.add("calendar-hours");
                        document.querySelector(`.calendar-checkbox[value="${calendarId}"]`)
                            .parentNode.appendChild(hoursElement);
                    }
                    hoursElement.textContent = `${calendarHours[calendarId].toFixed(2)} hrs`;
                });

                // Calculate and display total hours
                const totalHours = Object.values(calendarHours).reduce((sum, hours) => sum + hours, 0);
                totalHoursSpan.textContent = `${totalHours.toFixed(2)} hrs`;

                console.log(`✅ Total Scheduled Hours: ${totalHours.toFixed(2)} hrs`);
            }
        );
    }

    function searchEvents() {
        const keyword = searchBox.value.toLowerCase();
        const selectedCalendars = Array.from(document.querySelectorAll(".calendar-checkbox:checked"))
            .map(checkbox => checkbox.value);
        const startDate = document.getElementById("start-date").value;
        const endDate = document.getElementById("end-date").value;

        if (!startDate || !endDate) {
            alert("Please select a start and end date.");
            return;
        }
    
        if (selectedCalendars.length === 0) {
            alert("Please select at least one calendar.");
            return;
        }

        chrome.runtime.sendMessage(
            { action: "searchEvents", calendars: selectedCalendars, keyword, startDate, endDate },
            function (response) {
                if (chrome.runtime.lastError) {
                    console.error("❌ [Popup] Message port error:", chrome.runtime.lastError.message);
                    alert("Failed to communicate with the background script.");
                    return;
                }

                if (!response || response.error) {
                    console.error("❌ [Popup] Error searching events:", response?.error || "Unknown error");
                    alert(`Error searching events: ${response?.error || "Unknown error"}`);
                    return;
                }

                const filteredEvents = response.events;
                const calendarHours = {};

                filteredEvents.forEach(event => {
                    const calendarId = event.calendarId || event.organizer?.email;
                    if (!calendarId) {
                        console.warn("⚠️ Skipping event due to missing calendarId:", event);
                        return;
                    }

                    const startTime = new Date(event.start.dateTime);
                    const endTime = new Date(event.end.dateTime);
                    const durationHours = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours

                    if (!calendarHours[calendarId]) {
                        calendarHours[calendarId] = 0;
                    }
                    calendarHours[calendarId] += durationHours;
                });

                console.log("📊 Calculated hours per calendar:", calendarHours);

                // Update UI for each calendar
                Object.keys(calendarHours).forEach(calendarId => {
                    let hoursElement = document.getElementById(`hours-${calendarId}`);
                    if (!hoursElement) {
                        hoursElement = document.createElement("span");
                        hoursElement.id = `hours-${calendarId}`;
                        hoursElement.classList.add("calendar-hours");
                        document.querySelector(`.calendar-checkbox[value="${calendarId}"]`)
                            .parentNode.appendChild(hoursElement);
                    }
                    hoursElement.textContent = `${calendarHours[calendarId].toFixed(2)} hrs`;
                });

                // Calculate and display total hours
                const totalHours = Object.values(calendarHours).reduce((sum, hours) => sum + hours, 0);
                totalHoursSpan.textContent = `${totalHours.toFixed(2)} hrs`;

                console.log(`✅ Total Scheduled Hours: ${totalHours.toFixed(2)} hrs`);
            }
        );
    }

    calculateButton.addEventListener("click", fetchEventsForSelectedCalendars);
    searchBox.addEventListener("input", searchEvents);
    viewSelect.addEventListener('change', function() {
        if (viewSelect.value === 'billable-hours') {
            billableSection.style.display = 'block';
        } else {
            billableSection.style.display = 'none';
        }
    });
    fetchCalendars();
});
