async function fetchCalendars() {
    try {
        chrome.runtime.sendMessage({ action: "fetchCalendars" }, function(response) {
            if (response.error) {
                console.error("Failed to fetch calendar list:", response.error);
                return;
            }

            const calendarSelect = document.getElementById("calendar-select");
            calendarSelect.innerHTML = ""; // Clear previous options

            response.calendarList.forEach(calendar => {
                const option = document.createElement("option");
                option.value = calendar.id;
                option.textContent = calendar.summary;
                calendarSelect.appendChild(option);
            });
        });
    } catch (error) {
        console.error("Error fetching calendar list:", error);
    }
}

// Run fetchCalendars when the popup loads
document.addEventListener("DOMContentLoaded", fetchCalendars);
