import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const TargetNode = ({ data }: { data: { label: string } }) => {
  return (
    <div style={{
      padding: '10px 20px',
      borderRadius: '5px',
      border: '1px solid #198754',
      backgroundColor: '#D1E7DD',
      textAlign: 'center',
      width: 180,
    }}>
      <Handle type="target" position={Position.Left} id="left" />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Right} id="right" />
    </div>
  );
};

export default memo(TargetNode);
