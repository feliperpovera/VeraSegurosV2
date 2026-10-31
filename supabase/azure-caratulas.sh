#!/usr/bin/env bash
# Crea la Logic App "verabot-caratulas": cada correo nuevo con PDF en la bandeja de entrada de la cuenta
# autorizada en la conexión office365-verabot (info@) → función caratulas de Supabase (Claude lee la carátula).
# Correr en Azure Cloud Shell (Bash). Pide la clave: Supabase → Table Editor → config_interna → caratulas_key.
set -euo pipefail
SUB=9ece0ebf-9133-434e-a821-58beb23f75c2
RG=rg-vera-bot
LOC=northcentralus
read -rsp "Clave caratulas_key: " CLAVE; echo

cat > /tmp/caratulas.json <<'JSON'
{
  "location": "__LOC__",
  "properties": {
    "state": "Enabled",
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "contentVersion": "1.0.0.0",
      "parameters": { "$connections": { "type": "Object" }, "clave": { "type": "SecureString" } },
      "triggers": {
        "Correo_con_adjunto": {
          "type": "ApiConnection",
          "recurrence": { "frequency": "Minute", "interval": 3 },
          "splitOn": "@triggerBody()?['value']",
          "inputs": {
            "host": { "connection": { "name": "@parameters('$connections')['office365']['connectionId']" } },
            "method": "get",
            "path": "/v3/Mails/OnNewEmail",
            "queries": { "folderPath": "Inbox", "importance": "Any", "fetchOnlyWithAttachment": true, "includeAttachments": true }
          }
        }
      },
      "actions": {
        "Cada_adjunto": {
          "type": "Foreach",
          "foreach": "@triggerBody()?['attachments']",
          "actions": {
            "Es_PDF": {
              "type": "If",
              "expression": { "or": [
                { "contains": [ "@toLower(coalesce(items('Cada_adjunto')?['contentType'], ''))", "pdf" ] },
                { "endsWith": [ "@toLower(coalesce(items('Cada_adjunto')?['name'], ''))", ".pdf" ] }
              ] },
              "actions": {
                "Enviar_a_Supabase": {
                  "type": "Http",
                  "inputs": {
                    "method": "POST",
                    "uri": "https://cwfvqusyvfdohjmgefli.supabase.co/functions/v1/caratulas",
                    "headers": { "content-type": "application/json", "x-clave": "@parameters('clave')" },
                    "body": {
                      "mensaje": "@triggerBody()?['id']",
                      "de": "@triggerBody()?['from']",
                      "asunto": "@triggerBody()?['subject']",
                      "recibido": "@triggerBody()?['receivedDateTime']",
                      "nombre": "@items('Cada_adjunto')?['name']",
                      "contenido": "@items('Cada_adjunto')?['contentBytes']"
                    },
                    "retryPolicy": { "type": "exponential", "count": 4, "interval": "PT1M" }
                  }
                }
              },
              "else": { "actions": {} }
            }
          },
          "runtimeConfiguration": { "concurrency": { "repetitions": 1 } }
        }
      },
      "outputs": {}
    },
    "parameters": {
      "$connections": { "value": { "office365": {
        "connectionId": "/subscriptions/__SUB__/resourceGroups/__RG__/providers/Microsoft.Web/connections/office365-verabot",
        "connectionName": "office365-verabot",
        "id": "/subscriptions/__SUB__/providers/Microsoft.Web/locations/__LOC__/managedApis/office365"
      } } },
      "clave": { "value": "__CLAVE__" }
    }
  }
}
JSON
sed -i "s|__SUB__|$SUB|g; s|__RG__|$RG|g; s|__LOC__|$LOC|g; s|__CLAVE__|$CLAVE|" /tmp/caratulas.json

az rest --method put \
  --url "https://management.azure.com/subscriptions/$SUB/resourceGroups/$RG/providers/Microsoft.Logic/workflows/verabot-caratulas?api-version=2019-05-01" \
  --body @/tmp/caratulas.json --query "{nombre:name, estado:properties.state}" -o table
rm -f /tmp/caratulas.json
echo "Listo. Envía un PDF de prueba a info@ y revisa en el CRM → Producción / Por revisar (tarda unos 3 minutos)."
