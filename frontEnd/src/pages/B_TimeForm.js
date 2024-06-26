import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, Views, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import './B_TimeForm.css';
import axios from 'axios';

// Create a localizer using moment - outside so it doesn't redo upon re-render
const localizer = momentLocalizer(moment);


function TimeForm() {
  // stores events shown on calendar
 const [myEvents, setEvents] = useState([]);
 // stores loading state
 const [isLoading, setIsLoading] = useState(false);

 // function: delEvent
 const deleteEvent = useCallback((id) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
 }, []
 );
 // function: handles selection of timeslot
 const handleSelectSlot = useCallback(({ start, end }) => {
  // handleCase: prevent selection of sat + sunday
  const startDay = moment(start).day();
  const endDay = moment(end).day();
  if (startDay === 0 || startDay === 6 || endDay === 0 || endDay === 6) {
    window.alert('Events cannot be scheduled on Sundays or Saturdays.');
    return; // Exit the function early
 }
  // handleCase: prevent pre-day slots + multidays
  if (moment(start).startOf('day').isSame(start)) {
    return;
  }
  const _2ndStart = moment(start).format('dddd, h:mm A');
  const _2ndEnd = moment(end).format('dddd, h:mm A');
  const userIsSure = window.confirm(`Are you sure of this time?\n\nStart: ${_2ndStart}\nEnd: ${_2ndEnd}`);
  
  if (userIsSure) {
    // Merge overlapping events
    const updatedEvents = [...myEvents];

    for (let i = updatedEvents.length - 1; i >= 0; i--) {
      const oldEvent = updatedEvents[i];
      const oldEventStart = moment(oldEvent.start);
      const oldEventEnd = moment(oldEvent.end);

      // Case 1: New event is completely inside the old event
      if (oldEventStart.isSameOrBefore(start) && oldEventEnd.isSameOrAfter(end)) {
        // Delete the old event
        updatedEvents.splice(i, 1);
        // Configure properties of the new event
        start = oldEvent.start;
        end = oldEvent.end;
        // Continue to next loop iteration
        continue;
      }
      // Case 2: Old event is completely inside the new event
      else if (moment(start).isSameOrBefore(oldEventStart) && moment(end).isSameOrAfter(oldEventEnd)) {
        // Delete the old event
        updatedEvents.splice(i, 1);
        // Continue to next loop iteration
        continue;
      }
      // Case 3: New event ends inside old event
      else if (moment(end).isAfter(oldEventStart) && moment(end).isBefore(oldEventEnd)) {
        // Delete the old event
        updatedEvents.splice(i, 1);
        // Configure properties of the new event
        end = oldEvent.end;
        // Continue to next loop iteration
        continue;
      }
      // Case 4: Old event ends inside new event
      else if (oldEventStart.isAfter(start) && oldEventStart.isBefore(end)) {
        // Delete the old event
        updatedEvents.splice(i, 1);
        // Configure properties of the new event
        start = oldEvent.start;
        // Continue to next loop iteration
        continue;
      }
    }

    // Add the new event
    // if we delete stuff multiple items will have the same ID ... this leads to wrong deletes, weird identification, etc. Date.now() is ms since Unix epoch ... uber unique ID
    updatedEvents.push({ id: Date.now(), start, end });

    // Update state with merged or new event
    setEvents(updatedEvents);
  }
}, [myEvents, setEvents]);



 // function: handles selection of event -> delete
 const handleSelectEvent = useCallback(
    (event) => {
      // Show a confirmation dialog to delete the event
      if (window.confirm(`Do you want to delete the event: ${event.title}?`)) {
        deleteEvent(event.id);
      }
    },
    [deleteEvent] // Ensure deleteEvent is listed as a dependency
 );
 // function-buttonForUpdate: send events
 const handleSendToBackend = useCallback(() => {
  setIsLoading(true);

  // Create a new array of events with formatted start and end times
  const formattedEvents = myEvents.map(event => ({
      ...event,
      start: moment(event.start).format('ddd, HH'),
      end: moment(event.end).format('ddd, HH'),
  }));
  // see: what are we actually sending
  console.log('Formatted events payload:', { events: formattedEvents });
  // Send the formatted events to the backend
  axios.post('http://localhost:9000/sentTimes', { events: formattedEvents })
      .then(response => {
          console.log('Events sent to backend successfully:', response.data);
          setIsLoading(false);
      })
      .catch(error => {
          console.error('Error sending events to backend:', error);
          setIsLoading(false);
      });
}, [myEvents]
);
// (test) useEffect: for viewing what event array looks like
 useEffect(() => {
  console.log(myEvents);
}, [myEvents]
);

 return (
  <div>
    <div className="height800">
      {/* Add a message at the top */}
      <div className="plead-message">
        Please go click and drag slowly, bugs if you do it too fast 🥺.
      </div>
      <Calendar
      // Why 2023? Seems that there's a specific way of how they store dates. Like if you put 2024, the first day of the calender is 31th of the previous year ... Think it's best to keep a 2023 for starting at 1
        defaultDate={new Date(2023, 0, 1)}
        defaultView={Views.WEEK}
        events={myEvents}
        localizer={localizer}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        scrollToTime={new Date(1970, 1, 1, 6)}
        toolbar={false}
        // dont worry about 1970, seems to be perfectly alright
        min={new Date(1970, 1, 1, 8)} // Start at 8 AM
        max={new Date(1970, 1, 1, 23)} // End at 8 PM
      />
      <button className="UpdateButton" onClick={handleSendToBackend}>Update</button>
    </div>
    {/* Loading indicator */}
    {isLoading && (
      <div className="spinner-container">
        <img src="/logo512.png" alt="Loading..." className="custom-spinner" />
      </div>)}
    </div>

 );}

 export default TimeForm;



