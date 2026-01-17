# Implement Radio Communication System

## 1. Create Radio Templates & Logic

We will define structured templates for radio communications to ensure realistic phrasing.

**File:** `src/data/radioTemplates.js`

* **Structure: (the JS below is just a rough plan and need to be revised based on the following notes)**

* For Pilot:

  * **Note here: you may need to implement real readback logic (e.g. readback of takeoff clearance: "Cleared for takeoff, {callsign}", readback of altitude change: "Climb and maintain FL230, {callsign}")**
  * Request will also involve departure clearance, takeoff clearance, landing clearance, etc.
  * Inform emergency shall include selectables of all failure types in the database.

    ```javascript
    export const RADIO_TEMPLATES = {
      READBACK: [
        { id: 'ack', label: 'Acknowledge', template: 'Copy that, {callsign}.' },
        { id: 'wilco', label: 'Wilco', template: 'Wilco, {callsign}.' }
      ],
      REQUEST: [
        { id: 'req_alt', label: 'Request Altitude', template: '{station}, {callsign} requesting climb/descent to {altitude}.', params: ['altitude'] },
        { id: 'req_direct', label: 'Request Direct', template: '{station}, {callsign} requesting direct to {waypoint}.', params: ['waypoint'] },
        { id: 'req_land', label: 'Request Landing', template: '{station}, {callsign} inbound for landing.' }
      ],
      INFORM: [
        { id: 'inf_checkin', label: 'Check In', template: '{station}, {callsign} with you at {altitude}.' },
        { id: 'inf_mayday', label: 'Declare Emergency', template: 'MAYDAY MAYDAY MAYDAY, {callsign}, declaring emergency.' }
      ]
    };
    ```

For ATC, we will need to implement an ATC response/communication logic:

1. It will response to our request/inform based on template and plan for future actions (write a ATC response database for our requests/inform)
2. It will automatically provide service to direct us (e.g. giving us TO clearance, change altitude, landing clearance, inform weather, etc) based on our flight position and, if any, abnormal behavior. This will be implemented through a static database.

For ATIS, since we haven't debug weather system and airport environmental system, ATIS will only reply "No ATIS Data for {airport}".

## 2. Create Radio Action Panel (Top-Right)

This new component will temporarily replace the "Captain Command" input box in the top-right corner.

**File:** `src/components/RadioActionPanel.jsx`

* **Features:**

  * **Mode Tabs**: `[READBACK]` `[REQUEST]` `[INFORM]`

  * **Action Buttons**: Context-sensitive buttons based on selected mode.

  * **Dynamic Inputs**: If a template requires parameters (e.g., altitude), show a small selector or numpad.

  * **Send Button**: Commits the message to the log.

## 3. Update Communication Module (Bottom Panel)

Refine the `CommunicationModule` to host the chat history and compact frequency controls.

**File:** `src/components/CommunicationModule.jsx`

* **Layout Changes:**

  * **Left**: Status & Connection (Unchanged).

  * **Middle (New)**: **Communication Log**. A scrollable text area showing history of Pilot (Green) and ATC (White/Blue) messages. Replaces or shares space with "Nearby Signals" (we will use a tab switch for "Signals/Log" or split the view).

  * **Right**: **Compact Frequency Controls**. Shrink the knobs and display to save space.

## 4. Integration in FlightInProgress

Connect the new panel and state management.

**File:** `src/components/FlightInProgress.jsx`

* **State**: Add `radioHistory` state array.

* **Logic**:

  * `handleRadioTransmit(message)`: Adds pilot message to history.

  * **Auto-Response**: Simple mock logic to generate an "ATC Copy" response after 2 seconds.

* **Render**: Conditionally render `RadioActionPanel` instead of the existing `<form>` command line.

## 5. Execution Steps

1. Create `radioTemplates.js`.
2. Create ATC response database.
3. Create ATCLogic.js
4. Create `RadioActionPanel.jsx`.
5. Modify `FlightInProgress.jsx` to integrate the new panel and state.
6. Modify `CommunicationModule.jsx` to display the message history and compact the UI.

