# Autumn School demonstration services

Deploy the internal-only demo services in the same namespace as the
Jupyter server:

```sh
kubectl apply -f deploy/kubernetes/demo-cim.yaml
kubectl apply -f deploy/kubernetes/demo-fdmi.yaml
kubectl apply -f deploy/kubernetes/demo-orchestration.yaml
```

Set these environment variables on the Jupyter workload and roll it out:

```text
JUVRE_CIM_URL=http://juvre-demo-cim:8080/v1/standards
JUVRE_FDMI_URL=http://juvre-demo-fdmi:8080/v1/submissions
JUVRE_FEDERATION_URL=http://juvre-demo-federation:8080/v1/register
JUVRE_CATALOGUE_URL=http://juvre-demo-federation:8080/v1/catalogue
JUVRE_PREDICTION_SITE_SECONDS=75
JUVRE_ORCHESTRATION_STAGE_SECONDS=4
```

Both Services are `ClusterIP` by default and need no ingress. Without the
variables, JuVRE uses contract-equivalent embedded services for a local demo.
Neither path performs real EGI authentication, external FDMI delivery, Zenodo
publication, DOI minting, or standards certification.

Prediction queues and simulated target runs use authenticated Jupyter server
endpoints because they persist results beside the user's local experiment
metadata. The duration variables give about 75 seconds per predicted site and
60 seconds for a full staged rerun. Automated checks inject zero-duration
settings.
