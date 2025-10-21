import React, { useState, useEffect, useMemo } from 'react';
import { Typography, CircularProgress, Paper, FormControl, InputLabel, Select, MenuItem, Grid } from '@mui/material';
import ReactFlow, { Node, Edge, Controls, MiniMap, Background, Position } from 'reactflow';
import TargetNode from './TargetNode';

// This is a simplified version of the parsing logic. 
// In a real app, this would be a shared utility function.
const getSelectorLabels = (selector: any, type: string): string => {
  if (!selector || Object.keys(selector).length === 0) return `all ${type}s`;
  const labels = selector.matchLabels || selector;
  if (Object.keys(labels).length === 0) return `all ${type}s`;
  return Object.entries(labels).map(([k, v]) => k === 'kubernetes.io/metadata.name' ? v as string : `${k}=${v}`).join('\n');
};

const nodeTypes = { targetNode: TargetNode };
const nodeWidth = 180;
const nodeHeight = 100;

export default function ClusterVisualizer() {
  const [allPolicies, setAllPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/policies');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch policies.');
        }
        const data = await response.json();
        setAllPolicies(data.items || []);
        setError(null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, []);

  const namespaces = useMemo(() => {
    const ns = new Set(allPolicies.map(p => p.metadata.namespace));
    return Array.from(ns);
  }, [allPolicies]);

  useEffect(() => {
    if (namespaces.length > 0 && !selectedNamespace) {
      setSelectedNamespace(namespaces[0]);
    }
  }, [namespaces, selectedNamespace]);

  useEffect(() => {
    if (!selectedNamespace) return;

    const policiesInNamespace = allPolicies.filter(p => p.metadata.namespace === selectedNamespace);
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let idCounter = 0;
    let yOffset = 0;

    policiesInNamespace.forEach((policy) => {
      const policyId = `policy-${policy.metadata.name}`;
      const ingressNodes: Node[] = [];
      const egressNodes: Node[] = [];

      // Create ingress nodes
      if (policy.spec.ingress) {
        policy.spec.ingress.forEach((rule: any, ruleIndex: number) => {
          const ports = rule.ports ? rule.ports.map((p: any) => `port ${p.port}/${p.protocol}`).join('\n') : 'all ports';
          const fromRule = rule.from || rule._from;
          if (!fromRule || fromRule.length === 0) {
            const fromId = `${policyId}-ingress-all-${ruleIndex}-${idCounter++}`;
            ingressNodes.push({ id: fromId, data: { label: 'All Sources' }, style: { backgroundColor: '#CFF4FC', borderColor: '#0DCAF0' }, sourcePosition: Position.Right, position: {x:0, y:0} });
            newEdges.push({ id: `edge-${fromId}`, source: fromId, target: policyId, label: ports, animated: true, style: { stroke: '#0DCAF0' } });
          } else {
            fromRule.forEach((from: any, fromIndex: number) => {
              const fromId = `${policyId}-ingress-from-${ruleIndex}-${fromIndex}-${idCounter++}`;
              let label = '';
              if (from.ipBlock) label = `IP Block\n${from.ipBlock.cidr}`;
              else if (from.namespaceSelector) label = `Namespace\n${getSelectorLabels(from.namespaceSelector, 'namespace')}`;
              else if (from.podSelector) label = `Pods\n${getSelectorLabels(from.podSelector, 'pod')}`;
              ingressNodes.push({ id: fromId, data: { label }, style: { backgroundColor: '#CFF4FC', borderColor: '#0DCAF0' }, sourcePosition: Position.Right, position: {x:0, y:0} });
              newEdges.push({ id: `edge-${fromId}`, source: fromId, target: policyId, label: ports, animated: true, style: { stroke: '#0DCAF0' } });
            });
          }
        });
      }

      // Create egress nodes
      if (policy.spec.egress) {
        policy.spec.egress.forEach((rule: any, ruleIndex: number) => {
          const ports = rule.ports ? rule.ports.map((p: any) => `port ${p.port}/${p.protocol}`).join('\n') : 'all ports';
          if (!rule.to || rule.to.length === 0) {
            const toId = `${policyId}-egress-all-${ruleIndex}-${idCounter++}`;
            egressNodes.push({ id: toId, data: { label: 'All Destinations' }, style: { backgroundColor: '#FFF3CD', borderColor: '#FFC107' }, targetPosition: Position.Left, position: {x:0, y:0} });
            newEdges.push({ id: `edge-${toId}`, source: policyId, target: toId, label: ports, animated: true, style: { stroke: '#FFC107' } });
          } else {
            rule.to.forEach((to: any, toIndex: number) => {
              const toId = `${policyId}-egress-to-${ruleIndex}-${toIndex}-${idCounter++}`;
              let label = '';
              if (to.ipBlock) label = `IP Block\n${to.ipBlock.cidr}`;
              else if (to.namespaceSelector) label = `Namespace\n${getSelectorLabels(to.namespaceSelector, 'namespace')}`;
              else if (to.podSelector) label = `Pods\n${getSelectorLabels(to.podSelector, 'pod')}`;
              egressNodes.push({ id: toId, data: { label }, style: { backgroundColor: '#FFF3CD', borderColor: '#FFC107' }, targetPosition: Position.Left, position: {x:0, y:0} });
              newEdges.push({ id: `edge-${toId}`, source: policyId, target: toId, label: ports, animated: true, style: { stroke: '#FFC107' } });
            });
          }
        });
      }

      // Layouting for this policy
      const xSpacing = 300;
      const ySpacing = 120;
      const ingressX = 100;
      const targetX = ingressX + xSpacing;
      const egressX = targetX + xSpacing;
      const columnHeight = Math.max(ingressNodes.length, egressNodes.length) * ySpacing;

      let targetLabel;
      if (policy.spec.podSelector && Object.keys(policy.spec.podSelector).length > 0) {
        const podSelectorLabels = getSelectorLabels(policy.spec.podSelector, 'pod');
        targetLabel = `Target: ${podSelectorLabels}`;
      } else {
        targetLabel = `All Pods`;
      }

      const targetNode: Node = {
        id: policyId,
        type: 'targetNode',
        position: { x: targetX, y: yOffset + (columnHeight / 2) - (nodeHeight / 2) },
        data: { label: `Policy: ${policy.metadata.name}\n(${targetLabel})` },
      };

      ingressNodes.forEach((node, i) => node.position = { x: ingressX, y: yOffset + i * ySpacing });
      egressNodes.forEach((node, i) => node.position = { x: egressX, y: yOffset + i * ySpacing });
      
      newNodes.push(targetNode, ...ingressNodes, ...egressNodes);
      yOffset += columnHeight + ySpacing; // Add spacing for the next policy
    });

    setNodes(newNodes);
    setEdges(newEdges);

  }, [selectedNamespace, allPolicies]);


  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">Error: {error}</Typography>;
  }

  return (
    <Grid container direction="column" style={{ height: '100%' }}>
        <Grid item style={{ paddingBottom: '10px' }}>
            <FormControl size="small">
                <InputLabel>Namespace</InputLabel>
                <Select
                value={selectedNamespace}
                label="Namespace"
                onChange={(e) => setSelectedNamespace(e.target.value as string)}
                >
                {namespaces.map((ns) => (
                    <MenuItem key={ns} value={ns}>
                    {ns}
                    </MenuItem>
                ))}
                </Select>
            </FormControl>
        </Grid>
        <Grid item style={{ flexGrow: 1 }}>
            <Paper elevation={3} style={{ height: '100%' }}>
                <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
                    <Controls />
                    <MiniMap />
                    <Background />
                </ReactFlow>
            </Paper>
        </Grid>
    </Grid>
  );
}