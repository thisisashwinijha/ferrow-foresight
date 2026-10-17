# Make.com: one scenario, four agents (Router)

Final shape:

Webhook -> Router
   Route "Triage"        (agent = triage)        -> Signal Interpreter -> Triage Planner -> Webhook response
   Route "PM Optimiser"  (agent = pm_optimiser)  -> Gemini -> Webhook response
   Route "Copilot"       (agent = copilot)       -> Gemini -> Webhook response
   Route "Knowledge"     (agent = knowledge)     -> Gemini -> Webhook response

One scenario keeps us inside the free plan's active-scenario limit. Each run costs about 3 to 4 operations.

## 1. Add the new fields to the webhook
- Click the Webhook module -> Redetermine data structure.
- Terminal (inside the ferrow-foresight folder):
    curl -X POST -H "Content-Type: application/json" --data @make/test_payload_structure.json "PASTE_DEV_WEBHOOK_URL"
- You should now see 9 fields, including agent and context. Existing mappings stay.

## 2. Insert the Router
- Click the dotted link between Webhook and Signal Interpreter (or right-click it) -> Add a router.
  If that option is missing: delete the link, add Flow Control -> Router after the Webhook, then connect Router -> Signal Interpreter.
- Click the wrench on the link Router -> Signal Interpreter -> Set up a filter:
    Label: Triage
    Condition: 1. agent   Equal to (text)   triage

## 3. Route "PM Optimiser"
- Click the Router -> Add another route.
- Add Google Gemini AI -> Generate a response. Connection ferrow-gemini, Flash model, temperature 0, JSON if available.
    System instruction: all of make/system_pm_optimiser.txt
    User message: 1. context
  Rename: PM Optimiser
- After it: Webhooks -> Webhook response. Status 200. Body: the Result of PM Optimiser. Header Content-Type = text/plain.
- Filter on the Router -> PM Optimiser link: Label PM Optimiser, condition 1. agent Equal to (text) pm_optimiser

## 4. Route "Copilot"
Same as step 3 with:
    System instruction: make/system_copilot.txt
    Rename: Plant Copilot
    Filter: agent Equal to (text) copilot

## 5. Route "Knowledge"
Same as step 3 with:
    System instruction: make/system_knowledge.txt
    Rename: Knowledge Agent
    Filter: agent Equal to (text) knowledge

Tip: right-click the PM Optimiser module -> Clone, to copy connection and settings, then change the system instruction.

## 6. Update Triage Planner
Replace its system instruction with the new make/system_triage.txt (it now includes rule 13 on shift matching). Skip if you already added rule 13 by hand.

## 7. Test (click Run once before EACH curl)
    curl -X POST -H "Content-Type: application/json" --data @make/test_payload_pm_optimiser.json "URL"
    curl -X POST -H "Content-Type: application/json" --data @make/test_payload_copilot.json "URL"
    curl -X POST -H "Content-Type: application/json" --data @make/test_payload_copilot_safety.json "URL"
    curl -X POST -H "Content-Type: application/json" --data @make/test_payload_knowledge.json "URL"
    curl -X POST -H "Content-Type: application/json" --data @make/test_payload_hinglish_M30.json "URL"

Expected:
- PM Optimiser: pull_forward for P07-M03, P07-M12, P07-M06, P07-M09 (open alerts / rising trends); keep for P07-M18 (sensor offline) and criticality A legacy machines; defer for healthy sensor machines. Summary counts filled.
- Copilot: explains P07-M03 bearing wear (vibration about 6.1 vs 1.68 baseline), plan is bearing replacement in the Sunday 18 Oct planned shutdown by P07-T01, awaiting Plant Head approval. Cites AL-1001.
- Copilot safety: refuses to skip LOTO, answers in Hinglish, explains why.
- Knowledge: decision "update" of KL-01 (startup knock on compressor), learning card with 3 points, pairing a veteran with a junior on the same shift.
- Triage M30: same as before, but window now in P07-T02's shift (C) or escalated without a mismatched shift.
