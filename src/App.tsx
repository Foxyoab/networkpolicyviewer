import React, { useState, useCallback, useEffect } from 'react';
import { TextField, AppBar, Toolbar, Typography, Container, Grid, Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import ReactFlow, {
  Node,
  Edge,
  EdgeChange,
  addEdge,
  applyEdgeChanges,
  MiniMap,
  Controls,
  Background,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import * as yaml from 'js-yaml';
import TargetNode from './TargetNode';

const initialYaml = `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-network-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      role: db
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - ipBlock:
        cidr: 172.17.0.0/16
        except:
        - 172.17.1.0/24
    - namespaceSelector:
        matchLabels:
          project: myproject
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 6379
  egress:
  - to:
    - ipBlock:
        cidr: 10.0.0.0/24
    ports:
    - protocol: TCP
      port: 5978
`;

const nodeTypes = {
  targetNode: TargetNode,
};

const getSelectorLabels = (selector: any, type: string): string => {
  if (!selector || Object.keys(selector).length === 0) {
    return `all ${type}s`;
  }
  if (selector.matchLabels) {
    return Object.entries(selector.matchLabels)
      .map(([k, v]) => {
        if (k === 'kubernetes.io/metadata.name') {
          return v as string;
        }
        return `${k}=${v}`;
      })
      .join('\n');
  }
  return '';
};

const nodeWidth = 180;
const nodeHeight = 100;

function App() {
  const [yamlInput, setYamlInput] = useState(initialYaml);
  const [policyDocuments, setPolicyDocuments] = useState<Array<{ yaml: string; namespace: string }>>([]);
  const [selectedPolicyIndex, setSelectedPolicyIndex] = useState(0);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [error, setError] = useState('');

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  // Effect to split the yaml input into multiple documents
  useEffect(() => {
    const documents = yamlInput.split(/---\s*\n/).filter(s => s.trim() !== '');
    const parsedDocuments = documents.map(doc => {
      try {
        const policy = yaml.load(doc) as any;
        const namespace = policy?.metadata?.namespace || 'unknown-namespace';
        return { yaml: doc, namespace };
      } catch (e) {
        return { yaml: doc, namespace: 'invalid-yaml' };
      }
    });
    setPolicyDocuments(parsedDocuments);
    setSelectedPolicyIndex(0);
  }, [yamlInput]);

  // Effect to visualize the selected policy
  useEffect(() => {
    if (policyDocuments.length === 0 || selectedPolicyIndex >= policyDocuments.length) {
      setNodes([]);
      setEdges([]);
      setError('');
      return;
    }

    const parseAndVisualize = (policyData: { yaml: string; namespace: string }) => {
      try {
        const policy = yaml.load(policyData.yaml) as any;
        if (!policy || typeof policy !== 'object' || !policy.spec) {
          setError('Invalid NetworkPolicy: Missing spec.');
          setNodes([]);
          setEdges([]);
          return;
        }

        const spec = policy.spec;
        const newEdges: Edge[] = [];
        let idCounter = 0;

        const ingressNodes: Node[] = [];
        const egressNodes: Node[] = [];

        const podSelectorId = `pod-selector-${idCounter++}`;

        if (spec.ingress) {
          spec.ingress.forEach((rule: any, ruleIndex: number) => {
            const ports = rule.ports ? rule.ports.map((p: any) => `port ${p.port}/${p.protocol}`).join('\n') : 'all ports';
            if (!rule.from || rule.from.length === 0) {
              const fromId = `ingress-all-${ruleIndex}-${idCounter++}`;
              ingressNodes.push({
                id: fromId,
                position: { x: 0, y: 0 },
                data: { label: 'All Sources' },
                style: { backgroundColor: '#CFF4FC', borderColor: '#0DCAF0' },
                sourcePosition: Position.Right,
              });
              newEdges.push({
                id: `edge-ingress-all-${ruleIndex}`,
                source: fromId,
                target: podSelectorId,
                label: ports,
                animated: true,
                style: { stroke: '#0DCAF0' },
              });
            } else {
              rule.from.forEach((from: any, fromIndex: number) => {
                const fromId = `ingress-from-${ruleIndex}-${fromIndex}-${idCounter++}`;
                let label = '';
                if (from.ipBlock) {
                  label = `IP Block\n${from.ipBlock.cidr}`;
                } else if (from.namespaceSelector) {
                  label = `Namespace\n${getSelectorLabels(from.namespaceSelector, 'namespace')}`;
                } else if (from.podSelector) {
                  label = `Pods\n${getSelectorLabels(from.podSelector, 'pod')}`;
                }

                ingressNodes.push({
                  id: fromId,
                  position: { x: 0, y: 0 },
                  data: { label },
                  style: { backgroundColor: '#CFF4FC', borderColor: '#0DCAF0' },
                  sourcePosition: Position.Right,
                });
                newEdges.push({
                  id: `edge-ingress-${ruleIndex}-${fromIndex}`,
                  source: fromId,
                  target: podSelectorId,
                  label: ports,
                  animated: true,
                  style: { stroke: '#0DCAF0' },
                });
              });
            }
          });
        }

        if (spec.egress) {
          spec.egress.forEach((rule: any, ruleIndex: number) => {
            const ports = rule.ports ? rule.ports.map((p: any) => `port ${p.port}/${p.protocol}`).join('\n') : 'all ports';
            if (!rule.to || rule.to.length === 0) {
              const toId = `egress-all-${ruleIndex}-${idCounter++}`;
              egressNodes.push({
                id: toId,
                position: { x: 0, y: 0 },
                data: { label: 'All Destinations' },
                style: { backgroundColor: '#FFF3CD', borderColor: '#FFC107' },
                targetPosition: Position.Left,
              });
              newEdges.push({
                id: `edge-egress-all-${ruleIndex}`,
                source: podSelectorId,
                target: toId,
                label: ports,
                animated: true,
                style: { stroke: '#FFC107' },
              });
            } else {
              rule.to.forEach((to: any, toIndex: number) => {
                const toId = `egress-to-${ruleIndex}-${toIndex}-${idCounter++}`;
                let label = '';
                if (to.ipBlock) {
                  label = `IP Block\n${to.ipBlock.cidr}`;
                } else if (to.namespaceSelector) {
                  label = `Namespace\n${getSelectorLabels(to.namespaceSelector, 'namespace')}`;
                } else if (to.podSelector) {
                  label = `Pods\n${getSelectorLabels(to.podSelector, 'pod')}`;
                }

                egressNodes.push({
                  id: toId,
                  position: { x: 0, y: 0 },
                  data: { label },
                  style: { backgroundColor: '#FFF3CD', borderColor: '#FFC107' },
                  targetPosition: Position.Left,
                });
                newEdges.push({
                  id: `edge-egress-${ruleIndex}-${toIndex}`,
                  source: podSelectorId,
                  target: toId,
                  label: ports,
                  animated: true,
                  style: { stroke: '#FFC107' },
                });
              });
            }
          });
        }

        const xSpacing = 300;
        const ySpacing = 150;
        const ingressX = 100;
        const targetX = ingressX + xSpacing;
        const egressX = targetX + xSpacing;

        const maxColumnHeight = Math.max(ingressNodes.length, egressNodes.length) * ySpacing;
        const targetY = maxColumnHeight / 2 - nodeHeight / 2;

        let targetLabel;
        if (spec.podSelector && Object.keys(spec.podSelector).length > 0) {
            const podSelectorLabels = getSelectorLabels(spec.podSelector, 'pod');
            targetLabel = `Target Pods\n(${podSelectorLabels})`;
        } else {
            targetLabel = `All Pods in\n'${policy.metadata.namespace}'`;
        }

        const targetNode: Node = {
          id: podSelectorId,
          type: 'targetNode',
          position: { x: targetX, y: targetY },
          data: { label: targetLabel },
        };

        ingressNodes.forEach((node, i) => {
          node.position = { x: ingressX, y: i * ySpacing };
        });

        egressNodes.forEach((node, i) => {
          node.position = { x: egressX, y: i * ySpacing };
        });

        const newNodes = [...ingressNodes, targetNode, ...egressNodes];

        setNodes(newNodes);
        setEdges(newEdges);
        setError('');
      } catch (e) {
        if (e instanceof Error) {
          setError(`YAML Parsing Error: ${e.message}`);
        }
        else {
          setError('An unknown error occurred during YAML parsing.');
        }
        setNodes([]);
        setEdges([]);
      }
    };

    parseAndVisualize(policyDocuments[selectedPolicyIndex]);

  }, [policyDocuments, selectedPolicyIndex]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            Kubernetes Network Policy Visualizer
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth={false} style={{ flexGrow: 1, paddingTop: '20px', paddingBottom: '20px', display: 'flex' }}>
        <Grid container spacing={2} style={{ flexGrow: 1 }}>
          <Grid item xs={12} md={5} style={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" gutterBottom>
              Policy YAML
            </Typography>
            <Paper elevation={3} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <TextField
                multiline
                fullWidth
                value={yamlInput}
                onChange={(e) => setYamlInput(e.target.value)}
                variant="outlined"
                style={{ flexGrow: 1 }}
                InputProps={{
                  style: {
                    height: '100%',
                    alignItems: 'flex-start',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                  }
                }}
              />
            </Paper>
            {error && <Paper elevation={2} style={{ padding: '10px', marginTop: '10px', backgroundColor: '#f8d7da', color: '#721c24' }}>{error}</Paper>}
          </Grid>
          <Grid item xs={12} md={7} style={{display: 'flex', flexDirection: 'column'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <Typography variant="h5" gutterBottom>
                Visualization
              </Typography>
              {policyDocuments.length > 1 && (
                <FormControl size="small">
                  <InputLabel>Policy</InputLabel>
                  <Select
                    value={selectedPolicyIndex}
                    label="Policy"
                    onChange={(e) => setSelectedPolicyIndex(e.target.value as number)}
                  >
                    {policyDocuments.map((doc, index) => (
                      <MenuItem key={index} value={index}>
                        {`Policy: ${doc.namespace}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </div>
            <Paper elevation={3} style={{ flexGrow: 1, height: 'calc(100% - 40px)' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
              >
                <Controls />
                <MiniMap />
                <Background gap={12} size={1} />
              </ReactFlow>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
}

export default App;