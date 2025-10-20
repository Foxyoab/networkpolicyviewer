import React from 'react';
import { AppBar, Toolbar, Typography, Container, Button } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import YamlVisualizer from './YamlVisualizer';
import ClusterVisualizer from './ClusterVisualizer';

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Kubernetes Network Policy Visualizer
            </Typography>
            <Button color="inherit" component={Link} to="/">YAML Visualizer</Button>
            <Button color="inherit" component={Link} to="/cluster">Cluster Visualizer</Button>
          </Toolbar>
        </AppBar>
        <Container maxWidth={false} style={{ flexGrow: 1, paddingTop: '20px', paddingBottom: '20px', display: 'flex' }}>
          <Routes>
            <Route path="/" element={<YamlVisualizer />} />
            <Route path="/cluster" element={<ClusterVisualizer />} />
          </Routes>
        </Container>
      </div>
    </Router>
  );
}

export default App;
