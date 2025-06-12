
AUTH_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJySUJPYjZZY3p2ZE4xNVpuNHFkUTRLdEQ5VUhyY1dwNWJCT3NaLXpYbXM0In0.eyJleHAiOjE3NDk2ODkzMjUsImlhdCI6MTc0OTYyNDcyMywiYXV0aF90aW1lIjoxNzQ5NjI0NTY3LCJqdGkiOiI2ZDYyNGMxOS1hMmVhLTQ4NmEtODJkNi1hYzg4YjI4YThlNzgiLCJpc3MiOiJodHRwczovL2FjY291bnRzLmQ0c2NpZW5jZS5vcmcvYXV0aC9yZWFsbXMvZDRzY2llbmNlIiwiYXVkIjoiJTJGZDRzY2llbmNlLnJlc2VhcmNoLWluZnJhc3RydWN0dXJlcy5ldSUyRkQ0UmVzZWFyY2glMkZHcmVlbkRJR0lUIiwic3ViIjoiOWVkMzU2MzgtODY4ZC00NjIwLWEyYmMtZTVlNWQwOTMxMGU5IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoidG9rZW4tZXhjaGFuZ2UtZGVkaWNhdGVkIiwic2Vzc2lvbl9zdGF0ZSI6ImMzNDE2YzgyLTM5MDMtNDUyMy04NzY1LWEyYmM3Y2Y5OGFiNiIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1kNHNjaWVuY2UiLCJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiJTJGZDRzY2llbmNlLnJlc2VhcmNoLWluZnJhc3RydWN0dXJlcy5ldSUyRkQ0UmVzZWFyY2glMkZHcmVlbkRJR0lUIjp7InJvbGVzIjpbIkNhdGFsb2d1ZS1FZGl0b3IiLCJNZW1iZXIiXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwic2lkIjoiYzM0MTZjODItMzkwMy00NTIzLTg3NjUtYTJiYzdjZjk4YWI2IiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJHb27Dp2FsbyBGZXJyZWlyYSIsInByZWZlcnJlZF91c2VybmFtZSI6ImdvbmNhbG8uZmVycmVpcmE1MzhhNCIsImdpdmVuX25hbWUiOiJHb27Dp2FsbyIsImZhbWlseV9uYW1lIjoiRmVycmVpcmEiLCJlbWFpbCI6ImdvbmNhbG8uZmVycmVpcmFAc3R1ZGVudC51dmEubmwifQ.fNU2cGhBP0aDope7zStAY5zms1yU4l4FUXqZOzeL3mCOYa6i-mA-URNz1gX2AcbXiKyHxNp7F_yS_Z3RDRDFh3ZgwqfhY75WyuBygqWiTl50Cy4DU4VhvLbfL1Cae6jqVOvqxEsfcVAdVwUn4vfNg6S57tabwDJjuYMcaw2MRTLBdvbdvs2Zb5dBp5kaxrUP76Q4SWm5smQjBcdT4TNEMOCA_IAl27WHaT1djkTf0Kllvh0HKCeW5rGE7pk2O2KeaC1WatnsZG5c-5tzYyx5pcmL_nNJWvW8kw8t6DCNsoFcpVTRGskTCrmAvPBTZGiOkT6cU4ItKU4J8tkbN5eI-w"

curl \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $AUTH_TOKEN" \
-L "https://api.d4science.org/gcat/items" \
-D '
{
    "name": "programmatic_test_attach_curl",
    "title": "Test Experiment Attch Curl",
    "license_id": "AFL-3.0",
    "private": false,
    "notes": "Testing call from environment",
    "url": null,
    "tags": [
        {
            "name": "Test"
        }
    ],
    "resources": [
        {
            "name": "Parrot image",
            "url": "https://data.d4science.net/5Apv",
            "format": "jpg"
        }
    ],
    "extras": [
        {
            "key": "Creation Date",
            "value": "2025-06-11 "
        },
        {
            "key": "Creator",
            "value": "Gonçalo Ferreira"
        },
        {
            "key": "Creator Email",
            "value": "goncalo.ferreira@student.uva.nl"
        },
        {
            "key": "Creator Name PI (Principal Investigator)",
            "value": "my_orcid"
        },
        {
            "key": "Environment OS",
            "value": "MacOS"
        },
        {
            "key": "Environment Platform",
            "value": "GreenDIGIT"
        },
        {
            "key": "Experiment Dependencies",
            "value": null
        },
        {
            "key": "Experiment ID",
            "value": "experiment_id"
        },
        {
            "key": "GreenDIGIT Node",
            "value": "node_01"
        },
        {
            "key": "Programming Language",
            "value": "python"
        },
        {
            "key": "Project ID",
            "value": "project_id"
        },
        {
            "key": "Session reading metrics",
            "value": "session_reading_metrics"
        },
        {
            "key": "system:type",
            "value": "Experiment"
        }
    ]
}'
