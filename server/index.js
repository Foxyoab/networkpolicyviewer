const express = require('express');
const cors = require('cors');

async function startServer() {
  console.log('[Backend] Starting server...');

  console.log('[Backend] Dynamically importing @kubernetes/client-node...');
  const k8s = await import('@kubernetes/client-node');
  console.log('[Backend] Kubernetes client loaded.');

  const app = express();
  const port = 3001;

  app.use(cors());
  console.log('[Backend] CORS middleware enabled.');

  app.get('/', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/policies', async (req, res) => {
    try {
      console.log('[Backend] /api/policies: Loading kubeconfig...');
      const kc = new k8s.KubeConfig();
      kc.loadFromDefault();
      console.log('[Backend] /api/policies: Kubeconfig loaded.');

      const k8sNetworkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
      console.log('[Backend] /api/policies: API client created.');

      // The response from the client IS the body (the V1NetworkPolicyList object)
      const policyList = await k8sNetworkingApi.listNetworkPolicyForAllNamespaces();
      
      console.log('[Backend] /api/policies: Successfully fetched policies. Forwarding.');
      res.json(policyList);

    } catch (error) {
      console.error('[Backend] Failed to fetch network policies:', error);
      res.status(500).json({ 
        error: 'Failed to connect to Kubernetes cluster.', 
        message: error.message || 'Please ensure you have a valid kubeconfig and are connected to a cluster.' 
      });
    }
  });

  app.listen(port, () => {
    console.log(`[Backend] Server listening on port ${port}`);
  });
  console.log('[Backend] Server listener attached.');
}

startServer().catch(e => {
  console.error('[Backend] CRITICAL STARTUP ERROR:', e);
  process.exit(1);
});
