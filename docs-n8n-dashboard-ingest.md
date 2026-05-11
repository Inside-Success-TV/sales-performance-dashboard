# n8n Dashboard Ingest Node

This file is the prepared n8n change. Do not apply it to the active workflow until the dashboard is deployed and these values exist:

- `DASHBOARD_INGEST_URL`: `https://<vercel-domain>/api/ingest`
- `INGEST_SECRET`: same value configured in the Vercel app

## Safe Insertion Point

Add one HTTP Request node named `Post to Dashboard` after `Insert Doc Content` succeeds. It should be a parallel sibling to `Update Scorecard PDF Link`.

Do not place it before the Drive-folder verification path, `Create Coaching Doc`, `Parse Doc Response`, or `Insert Doc Content`.

## Node Shape

```json
{
  "name": "Post to Dashboard",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.4,
  "position": [9460, 6460],
  "parameters": {
    "method": "POST",
    "url": "https://<vercel-domain>/api/ingest",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "Bearer <INGEST_SECRET>"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "contentType": "raw",
    "rawContentType": "application/json",
    "body": "={{ JSON.stringify({ airtable_record_id: $('Build PDF HTML').first().json.airtable_record_id, scorecard_key: $('If').item.json['Scorecard Key'] || $('If').item.json['Source Airtable Record ID'] || $('If').item.json['Meeting ID'], rep_name: $('If').item.json['Sales Rep'], rep_email: $('If').item.json['Sales Rep Email'], client_name: $('If').item.json['Client Name'], call_date: $('If').item.json['Date/Time'], meeting_id: $('If').item.json['Meeting ID'], meeting_title: $('If').item.json['Title Of Meeting'], meeting_link: $('If').item.json['Zoom Url'], transcript_link: $('If').item.json['Transcript Doc'], google_doc_id: $('Parse Doc Response').first().json.id, google_doc_link: $('Parse Doc Response').first().json.webViewLink || $('Parse Doc Response').first().json.alternateLink || '', call_status: 'scored', one_line_verdict: $('Performance Agent').first().json.output.airtable.scorecard_record.one_line_verdict, biggest_strength: $('Performance Agent').first().json.output.airtable.scorecard_record.biggest_strength, biggest_fix: $('Performance Agent').first().json.output.airtable.scorecard_record.biggest_fix, coaching_tip: $('Performance Agent').first().json.output.airtable.scorecard_record.coaching_tip, rudys_note: $('Performance Agent').first().json.output.airtable.scorecard_record.rudys_note, what_went_well: $('Performance Agent').first().json.output.airtable.scorecard_record.what_went_well, what_to_improve: $('Performance Agent').first().json.output.airtable.scorecard_record.what_to_improve, why_no_close: $('Performance Agent').first().json.output.airtable.scorecard_record.why_no_close, what_made_this_close_work: $('Performance Agent').first().json.output.airtable.scorecard_record.what_made_this_close_work, objections_surfaced: $('Performance Agent').first().json.output.airtable.scorecard_record.objections_surfaced }) }}",
    "options": {
      "response": {
        "response": {
          "responseFormat": "json",
          "fullResponse": false,
          "neverError": false
        }
      }
    }
  },
  "onError": "continueErrorOutput"
}
```

## Connections

`Insert Doc Content` success output should connect to both:

- `Update Scorecard PDF Link`
- `Post to Dashboard`

`Post to Dashboard` error output should connect to a Set node named `Set: dashboard_failed`, then to existing `Build Ops Alert`.

Suggested `Set: dashboard_failed` fields:

- `status`: `dashboard_failed`
- `reason`: `Dashboard ingest failed`
- `error_details`: `={{ $json.error?.message || $json.message || JSON.stringify($json).slice(0, 1000) }}`
- `source_airtable_record_id`: `={{ $('Build PDF HTML').first().json.airtable_record_id }}`

## Safety Notes

- Keep Slack, Airtable scorecard creation, Google Drive doc creation, stale-folder self-heal, and loop continuation unchanged.
- Use the HTTP Request node error output so an ingest failure alerts ops without stopping the working workflow.
- Run one real call after deployment and verify Slack, Drive, Airtable, and dashboard all succeed.
