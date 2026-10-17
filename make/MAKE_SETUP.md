# Make.com scenario: Ferrow Triage DEV

Flow: Webhook -> Gemini (Signal Interpreter) -> Gemini (Triage Planner) -> Webhook response
4 operations per run. The app gathers all context and does all database writes and guardrail checks; Make only orchestrates the two AI calls. This keeps keys and safety rules in one place.

## Module 1: Custom webhook (already created)
- Open scenario "Ferrow Triage DEV", click the webhook module.
- Click "Redetermine data structure". It now waits for a sample.
- In Terminal:
    cd ~/Documents/Projects/ferrow-foresight
    curl -X POST -H "Content-Type: application/json" --data @make/test_payload_sensor_M03.json "PASTE_DEV_WEBHOOK_URL"
- Make should say "Successfully determined". Fields: request_id, plant_id, machine_id, trigger, prompt_version, interpreter_input, triage_context.

## Module 2: Gemini, Signal Interpreter
- Click + after the webhook, search "Gemini", choose the Google Gemini AI app, module that generates a response / completion.
- Connection: create one with your Gemini API key (from AI Studio). Name it "ferrow-gemini".
- Model: the Flash model.
- System instruction / system prompt: paste ALL of make/system_interpreter.txt
- User message / prompt: map {{1.interpreter_input}}
- If available: temperature 0, response format / MIME type JSON.
- Right-click the module -> Rename -> "Signal Interpreter".

## Module 3: Gemini, Triage Planner
- Same app and module, same connection, same model.
- System instruction: paste ALL of make/system_triage.txt
- User message: map
    {{1.triage_context}}

    STRUCTURED OBSERVATION:
    {{2.<text output of module 2>}}
- Temperature 0, JSON response format if available.
- Rename -> "Triage Planner".

## Module 4: Webhook response
- Add Webhooks -> Webhook response.
- Status: 200
- Body (plain text, exactly this layout):
    {{2.<text output>}}
    @@@TRIAGE@@@
    {{3.<text output>}}
- Advanced settings -> Custom headers: Content-Type = text/plain
- Why plain text with a separator: model output can contain quotes or code fences that would break a JSON body. The app splits on @@@TRIAGE@@@ and parses each part safely.

## Test
- Click "Run once" (bottom left).
- In Terminal run the curl command again (sensor case), then the Hinglish case:
    curl -X POST -H "Content-Type: application/json" --data @make/test_payload_hinglish_M30.json "PASTE_DEV_WEBHOOK_URL"
- Terminal should print two JSON blocks separated by @@@TRIAGE@@@.
- Expected sensor case (P07-M03): bearing_wear, P1, replace, loto_required true, assigned P07-T01 or another Mechanical + LOTO technician.
- Expected Hinglish case (P07-M30): electrical_fault, P1, Electrical HT + LOTO required, escalate (only P07-T02 qualified, on shift C).
- Save the scenario. Leave it OFF until the app is wired (Run once is enough for testing).
