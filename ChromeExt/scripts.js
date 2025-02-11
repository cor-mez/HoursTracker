document.getElementById('searchButton').addEventListener('click', function() {
    const searchTerm = document.getElementById('search-box').value;
    searchEvents(searchTerm);
});

function searchEvents(searchTerm) {
    // Placeholder for calendars data, replace with actual data source
    const calendars = [
        {
            name: 'Work Calendar',
            events: [
                { title: 'Meeting with Bob', hours: 2 },
                { title: 'Project Planning', hours: 3 }
            ]
        },
        {
            name: 'Personal Calendar',
            events: [
                { title: 'Gym', hours: 1 },
                { title: 'Dentist Appointment', hours: 1.5 }
            ]
        }
    ];

    const results = calendars.map(calendar => {
        const filteredEvents = calendar.events.filter(event => event.title.toLowerCase().includes(searchTerm.toLowerCase()));
        const totalHours = filteredEvents.reduce((sum, event) => sum + event.hours, 0);
        return {
            calendarName: calendar.name,
            events: filteredEvents,
            totalHours: totalHours
        };
    });

    displayResults(results);
}

function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    results.forEach(result => {
        if (result.events.length > 0) {
            const calendarHeader = document.createElement('h2');
            calendarHeader.textContent = `${result.calendarName} (Total Hours: ${result.totalHours})`;
            resultsContainer.appendChild(calendarHeader);

            result.events.forEach(event => {
                const eventItem = document.createElement('p');
                eventItem.textContent = `${event.title} - ${event.hours} hours`;
                resultsContainer.appendChild(eventItem);
            });
        }
    });
}
