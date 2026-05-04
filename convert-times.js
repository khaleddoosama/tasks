const fs = require('fs');
const path = require('path');

// Read the original file
const data = JSON.parse(fs.readFileSync('schedule-data.json', 'utf8'));

function convertSingleTime(time24) {
  const [hours, minutes] = time24.split(':').map(Number);
  let period = hours >= 12 ? 'PM' : 'AM';
  let hours12 = hours % 12;
  if (hours12 === 0) hours12 = 12;
  return hours12 + ':' + String(minutes).padStart(2, '0') + ' ' + period;
}

function convertTo12Hour(time24) {
  if (!time24) return time24;
  
  if (time24.includes(' - ')) {
    const [start, end] = time24.split(' - ').map(t => t.trim());
    return convertSingleTime(start) + ' - ' + convertSingleTime(end);
  }
  return convertSingleTime(time24);
}

// Convert all times
data.days.forEach(day => {
  day.tasks.forEach(task => {
    task.time = convertTo12Hour(task.time);
  });
});

// Write the new file
fs.writeFileSync('schedule-data-12h.json', JSON.stringify(data, null, 4), 'utf8');

console.log('✓ File created: schedule-data-12h.json');
console.log('\nSample time conversions:');
console.log('  04:30 → 4:30 AM');
console.log('  12:00 → 12:00 PM');
console.log('  13:00 → 1:00 PM');
console.log('  00:30 → 12:30 AM');
