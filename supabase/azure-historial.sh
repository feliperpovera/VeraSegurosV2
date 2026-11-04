#!/usr/bin/env bash
# Crea la Logic App "verabot-historial": cada 3 minutos toma un día y una carpeta (Entrada, Enviados) del correo de info@ y manda
# sus PDF y ZIP a la función caratulas. Al llegar a hoy sigue con cada día nuevo. Solo lee: no marca nada como leído.
# Correr en Azure Cloud Shell (Bash). Pide la clave: Supabase → Table Editor → config_interna → caratulas_key.
set -euo pipefail
SUB=9ece0ebf-9133-434e-a821-58beb23f75c2
RG=rg-vera-bot
LOC=northcentralus
read -rsp "Clave caratulas_key: " CLAVE; echo
CLAVE=$(printf %s "$CLAVE" | sed 's/\x1b\[20[01]~//g' | tr -cd 'A-Za-z0-9')
[ ${#CLAVE} -ge 20 ] || { echo "La clave no se pegó bien (${#CLAVE} caracteres). Vuelve a correr el comando."; exit 1; }

cat > /tmp/historial.json <<'JSON'
{
  "location": "__LOC__",
  "properties": {
    "state": "Enabled",
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "contentVersion": "1.0.0.0",
      "parameters": { "$connections": { "type": "Object" }, "clave": { "type": "SecureString" } },
      "triggers": {
        "Cada_3_minutos": {
          "type": "Recurrence",
          "recurrence": { "frequency": "Minute", "interval": 3 },
          "runtimeConfiguration": { "concurrency": { "runs": 1 } }
        }
      },
      "actions": {
        "Ventana": {
          "type": "Http",
          "inputs": {
            "method": "POST",
            "uri": "https://cwfvqusyvfdohjmgefli.supabase.co/functions/v1/caratulas",
            "headers": { "content-type": "application/json", "x-clave": "@parameters('clave')" },
            "body": { "accion": "ventana" }
          }
        },
        "Falta_correo": {
          "type": "If",
          "runAfter": { "Ventana": [ "Succeeded" ] },
          "expression": { "and": [ { "equals": [ "@body('Ventana')?['fin']", false ] } ] },
          "actions": {
            "Buscar": {
              "type": "ApiConnection",
              "inputs": {
                "host": { "connection": { "name": "@parameters('$connections')['office365']['connectionId']" } },
                "method": "get",
                "path": "/v3/Mail",
                "queries": { "folderPath": "@body('Ventana')?['carpeta']", "searchQuery": "@body('Ventana')?['busqueda']", "top": 1000, "includeAttachments": false, "fetchOnlyUnread": false }
              }
            },
            "Cada_correo": {
              "type": "Foreach",
              "runAfter": { "Buscar": [ "Succeeded" ] },
              "foreach": "@body('Buscar')?['value']",
              "runtimeConfiguration": { "concurrency": { "repetitions": 3 } },
              "actions": {
                "Leer": {
                  "type": "ApiConnection",
                  "inputs": {
                    "host": { "connection": { "name": "@parameters('$connections')['office365']['connectionId']" } },
                    "method": "get",
                    "path": "/v2/Mail/@{encodeURIComponent(items('Cada_correo')?['id'])}",
                    "queries": { "includeAttachments": true }
                  }
                },
                "Cada_adjunto": {
                  "type": "Foreach",
                  "runAfter": { "Leer": [ "Succeeded" ] },
                  "foreach": "@coalesce(body('Leer')?['attachments'], json('[]'))",
                  "runtimeConfiguration": { "concurrency": { "repetitions": 1 } },
                  "actions": {
                    "Sirve": {
                      "type": "If",
                      "expression": { "or": [
                        { "endsWith": [ "@toLower(coalesce(items('Cada_adjunto')?['name'], ''))", ".pdf" ] },
                        { "endsWith": [ "@toLower(coalesce(items('Cada_adjunto')?['name'], ''))", ".zip" ] }
                      ] },
                      "actions": {
                        "Enviar_a_Supabase": {
                          "type": "Http",
                          "inputs": {
                            "method": "POST",
                            "uri": "https://cwfvqusyvfdohjmgefli.supabase.co/functions/v1/caratulas",
                            "headers": { "content-type": "application/json", "x-clave": "@parameters('clave')" },
                            "body": {
                              "historial": true,
                              "mensaje": "@items('Cada_correo')?['id']",
                              "de": "@items('Cada_correo')?['from']",
                              "asunto": "@items('Cada_correo')?['subject']",
                              "recibido": "@items('Cada_correo')?['receivedDateTime']",
                              "nombre": "@items('Cada_adjunto')?['name']",
                              "contenido": "@items('Cada_adjunto')?['contentBytes']"
                            },
                            "retryPolicy": { "type": "fixed", "count": 2, "interval": "PT1M" }
                          }
                        }
                      },
                      "else": { "actions": {} }
                    }
                  }
                }
              }
            },
            "Avanza": {
              "type": "Http",
              "runAfter": { "Cada_correo": [ "Succeeded", "Failed" ] },
              "inputs": {
                "method": "POST",
                "uri": "https://cwfvqusyvfdohjmgefli.supabase.co/functions/v1/caratulas",
                "headers": { "content-type": "application/json", "x-clave": "@parameters('clave')" },
                "body": { "accion": "avanza", "vistos": "@length(body('Buscar')?['value'])" }
              }
            }
          },
          "else": { "actions": {} }
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
sed -i "s|__SUB__|$SUB|g; s|__RG__|$RG|g; s|__LOC__|$LOC|g; s|__CLAVE__|$CLAVE|" /tmp/historial.json

az rest --method put \
  --url "https://management.azure.com/subscriptions/$SUB/resourceGroups/$RG/providers/Microsoft.Logic/workflows/verabot-historial?api-version=2019-05-01" \
  --headers Content-Type=application/json --body @/tmp/historial.json --query "{nombre:name, estado:properties.state}" -o table
rm -f /tmp/historial.json
echo "Listo. El recorrido arranca en 3 minutos y avanza solo desde el 1 de enero."
