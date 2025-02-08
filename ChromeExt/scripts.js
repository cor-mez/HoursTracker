document.addEventListener("DOMContentLoaded", function() {
    const toggleSwitch = document.getElementById("dark-mode-toggle");
    const body = document.body;

    // Check localStorage for theme preference
    if (localStorage.getItem("darkMode") === "enabled") {
        body.classList.add("dark-mode");
        toggleSwitch.checked = true;
    }

    toggleSwitch.addEventListener("change", () => {
        if (toggleSwitch.checked) {
            body.classList.add("dark-mode");
            localStorage.setItem("darkMode", "enabled");
        } else {
            body.classList.remove("dark-mode");
            localStorage.setItem("darkMode", "disabled");
        }
    });
});

function calculateHours() {
    let totalHours = Math.floor(Math.random() * 50) + 1; 
    document.getElementById("total-hours").textContent = `Total Hours: ${totalHours}`;
}
