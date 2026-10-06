# Autumn School mock services

Deploy the two internal-only demo services in the same namespace as the
Jupyter server:

```sh
kubectl apply -f deploy/kubernetes/mock-cim.yaml
kubectl apply -f deploy/kubernetes/mock-fdmi.yaml
```

Set these environment variables on the Jupyter workload and roll it out:

```text
JUVRE_CIM_URL=http://juvre-mock-cim:8080/v1/standards
JUVRE_FDMI_URL=http://juvre-mock-fdmi:8080/v1/submissions
```

Both Services are `ClusterIP` by default and need no ingress. Without the
variables, JuVRE uses contract-equivalent embedded mocks for a local demo.
Neither path performs real EGI authentication, external FDMI delivery, Zenodo
publication, DOI minting, or standards certification.
