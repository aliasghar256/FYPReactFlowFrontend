import React, { useCallback, useState, useEffect, useRef } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import axios from "axios";
import { BiSolidDockLeft } from "react-icons/bi";
import { useGlobalContext } from "./context";
import {deserializePlaybooks, serializePlaybooks, fetchAllPlaybooks} from "./Playbook/PlaybookManager";
import RightSideBar from "./RightSideBar/RightSideBar";

const Content = () => {
  const { isSidebarOpen, closeSidebar } = useGlobalContext();

  // ==============================
  // State
  // ==============================
  const [playbooks, setPlaybooks] = useState([]); // All playbooks from backend
  const [selectedPlaybook, setSelectedPlaybook] = useState(null); // Which playbook is "open"
  const [newPlaybookName, setNewPlaybookName] = useState("");
  const [newPlaybookCategory, setNewPlaybookCategory] = useState("");
  const [newPlayDescription, setNewPlayDescription] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodePath, setNodePath] = useState([]); // The ordered list of connected nodes
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  // Add two new pieces of state for selected nodes and edges:
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedEdges, setSelectedEdges] = useState([]);
  const [newIp, setNewIp] = useState("");
  const [refetchTrigger, setRefetchTrigger] = useState(false);
  const [shouldPollLogs, setShouldPollLogs] = useState(false);
  const pollingTimer = useRef(null);

  const triggerRefetch = () => setRefetchTrigger((prev) => !prev);



// This will be called automatically whenever the selection changes in the React Flow canvas
  const onSelectionChange = useCallback(({ nodes, edges }) => {
    setSelectedNodes(nodes || []);
    setSelectedEdges(edges || []);
  }, []);


  const ref = useRef(null);

  // ==============================
  // Fetch All Playbooks + Plays
  // ==============================

  const addUniqueEdges = (newEdges) => {
    setEdges((prevEdges) => {
      const existingEdgeIds = new Set(prevEdges.map((edge) => edge.id));
      const filteredEdges = newEdges.filter((edge) => !existingEdgeIds.has(edge.id));
      // console.log("Adding unique edges:", filteredEdges);
      return [...prevEdges, ...filteredEdges];
    });
  };

  const handleSetIp = async () => {
    if (!newIp) return;
    try {
      await axios.post("http://93.127.202.133:5000/setip", { ip: newIp });
      alert("Global IP set!");
      setNewIp("");
    } catch (err) {
      console.error("Error setting IP:", err);
    }
  };
  
  
  const onEdgesDelete = (edgesToDelete) => {
    setEdges((prevEdges) => {
      // Remove the edges that match the edgesToDelete
      const updatedEdges = prevEdges.filter(
        (edge) => !edgesToDelete.some((deletedEdge) => deletedEdge.id === edge.id)
      );
      // console.log("Edges after deletion:", updatedEdges); // Debugging log
      return updatedEdges;
    });
  };
  
  // 2) On RE-FETCH: update only the playbook list, not the graph
useEffect(() => {
  const fetchPlaybooksOnly = async () => {
    try {
      const data = await fetchAllPlaybooks();
      setPlaybooks(data || []);
    } catch (error) {
      console.error("Error fetching updated playbooks:", error);
    }
  };

  fetchPlaybooksOnly();
}, [refetchTrigger]);

  

  // 1) On MOUNT: fetch & build the initial nodes and edges
useEffect(() => {
  const fetchDataAndBuildGraph = async () => {
    const data = await fetchAllPlaybooks();
    console.log("MOUNT USE EFFECT CALLED");

    if (data) {
      // Transform into nodes/edges once
      const transformedNodes = Object.values(data).flatMap((playbook, playbookIndex) =>
        playbook.plays.map((play, playIndex) => ({
          id: play.id,
          position: { x: playIndex * 200, y: playbookIndex * 150 },
          data: { label: play.description },
          style: {
            background: play.completed ? "#A7F3D0" : "#FCA5A5",
            border: "1px solid #333",
          },
        }))
      );

      let count = 0;
      const transformedEdges = Object.values(data).flatMap((playbook) =>
        playbook.plays.flatMap((play) => {
          // forward / backward links
          const forwardEdges = play.forwardLinks?.map((targetId) => ({
            id: `edge-${play.playbookName}-${play.id}-${targetId}-${count++}`,
            source: play.id,
            target: targetId,
          })) || [];

          const backwardEdges = play.backwardLinks?.map((sourceId) => ({
            id: `edge-${play.playbookName}-${sourceId}-${play.id}-${count++}`,
            source: sourceId,
            target: play.id,
          })) || [];

          return [...forwardEdges, ...backwardEdges];
        })
      );

      // Set nodes & edges for the graph
      setNodes(transformedNodes);
      addUniqueEdges(transformedEdges);
    }

    // Regardless, update the playbooks list
    setPlaybooks(data || []);
  };

  fetchDataAndBuildGraph();
}, []); // runs only on initial mount
 // Run only once on component mount
  
  const deduplicateEdges = (edges) => {
    const edgeMap = new Map();
    edges.forEach((edge) => {
      if (!edgeMap.has(edge.id)) {
        edgeMap.set(edge.id, edge);
      }
    });
    return Array.from(edgeMap.values());
  };
  

useEffect(() => {
  updateNodePath();
  setEdges((prevEdges) => deduplicateEdges(prevEdges));

}, [edges]);
useEffect(() => {
  const handleKeyDown = (event) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // If there are selected edges, let’s delete them
      if (selectedEdges.length > 0) {
        onEdgesDelete(selectedEdges);  // or your own custom logic
      }
      // If you also want to delete selected nodes, you can do so here
      // e.g. onNodesDelete(selectedNodes)
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [selectedEdges, onEdgesDelete]); 


  // ==============================
  // Create a new playbook
  // ==============================
  const createNewPlaybook = async () => {
    if (!newPlaybookName || !newPlaybookCategory) return;
    try {
      const payload = { name: newPlaybookName, category: newPlaybookCategory };
      await axios.post("http://93.127.202.133:5000/playbook", payload);
      
      // Instead of calling fetchAllPlaybooks again, just trigger a re-fetch
      triggerRefetch();
  
      setNewPlaybookName("");
      setNewPlaybookCategory("");
      alert("Playbook created successfully!");
    } catch (error) {
      console.error("Error creating playbook:", error);
      alert("Failed to create playbook. Check console for details.");
    }
  };
  

  // ==============================
  // Add a new play to the selected playbook
  // ==============================
  const addNewPlay = async () => {
    if (!selectedPlaybook || !newPlayDescription) return;
    try {
      const payload = { description: newPlayDescription };
      const url = `http://93.127.202.133:5000/playbook/${selectedPlaybook.id}/create-play`;
      await axios.post(url, payload);
  
      // Again, just rely on triggerRefetch()
      triggerRefetch();
  
      setNewPlayDescription("");
      alert("Play added successfully!");
    } catch (error) {
      console.error("Error adding new play:", error);
      alert("Failed to add play. See console for details.");
    }
  };
  
  // ==============================
  // Execute a given playbook
  // ==============================
  const handleExecutePlaybook = async (playbookName) => {
    try {
      // Example: POST /playbook/<playbookName>/execute_all
      const url = `http://93.127.202.133:5000/playbook/${playbookName}/execute_all`;
      const res = await axios.post(url);
      console.log("Execute Playbook:", res.data);
      alert(`Playbook '${playbookName}' executed!`);
      startPollingLogs();
    } catch (error) {
      console.error("Error executing playbook:", error);
      alert("Playbook execution failed. See console for details.");
    }
  };

  // Content.jsx (excerpt)

const handleExecuteSinglePlay = async (playbookName, playId) => {
  if (!playbookName || !playId) return;

  try {
    const url = `http://93.127.202.133:5000/playbook/${playbookName}/execute_node_path`;
    const payload = { play_id: playId };

    const res = await axios.post(url, payload);
    alert("Single play executed!");
    console.log("Single Play Execution:", res.data);

    // Optionally, fetch logs or contexts
    // fetchDockerLogs();
    // fetchContextLogs(playbookName);
    startPollingLogs();
  } catch (error) {
    console.error("Error executing single play:", error);
    alert("Single-play execution failed. See console for details.");
  }
};

const startPollingLogs = () => {
  // If a previous timer is running, clear it first
  if (pollingTimer.current) {
    clearInterval(pollingTimer.current);
    pollingTimer.current = null;
  }

  // Turn on "shouldPollLogs"
  setShouldPollLogs(true);

  // Optionally, stop polling after 20 seconds or so
  pollingTimer.current = setTimeout(() => {
    setShouldPollLogs(false);   // Stop requesting logs
    pollingTimer.current = null;
  }, 20000); // 20 second polling window
};

  // ==============================
  // ReactFlow: onConnect
  // ==============================
  const onConnect = async (params) => {
    // Add the edge in the local UI
    const newEdge = {
      id: `edge-${params.source}-${params.target}`, // Unique ID for the edge
      source: params.source,
      target: params.target,
    };
  
    // Use addUniqueEdges to avoid duplicate edges
    addUniqueEdges([newEdge]);
  
    // Update the node path globally
    updateNodePath();
  
    // Notify the backend about the connection
    if (selectedPlaybook) {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);
  
      if (sourceNode && targetNode) {
        try {
          const url = `http://93.127.202.133:5000/playbook/${selectedPlaybook.id}/connect`;
          const payload = {
            parent_description: sourceNode.data.label,
            child_description: targetNode.data.label,
          };
          await axios.post(url, payload);
          console.log("Connected plays in backend:", payload);
        } catch (error) {
          console.error("Error connecting plays in backend:", error);
        }
      }
    }
  };
  
  
  

  // ==============================
  // Build the "nodePath" array
  // ==============================
  const updateNodePath = () => {
    const path = [];
    const visited = new Set();
  
    // Only start from nodes that are "sources" in the edges
    const startNodes = nodes.filter((node) =>
      edges.some((edge) => edge.source === node.id)
    );
  
    const traverse = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      path.push(nodeId);
  
      // Traverse connected children
      edges
        .filter((edge) => edge.source === nodeId)
        .forEach((edge) => traverse(edge.target));
    };
  
    startNodes.forEach((node) => traverse(node.id));
    setNodePath(path);
  };

  // ==============================
  // onDrop (drag from sidebar => canvas)
  // ==============================
  const onDrop = (event) => {
    event.preventDefault();
    const reactFlowBounds = ref.current.getBoundingClientRect();
    const blockData = JSON.parse(
      event.dataTransfer.getData("application/reactflow")
    );

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    // Make sure each "play" node has a unique ID
    // e.g. blockData might be { id: 'play-Nmap_test-0', description: '...', completed: ...}
    // If you drop the same node multiple times, you might need a more unique ID
    const newNode = {
      id: blockData.id,
      position,
      data: { label: blockData.description },
      style: {
        background: blockData.completed ? "#A7F3D0" : "#FCA5A5",
        border: "1px solid #333",
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  // (Optional) Execute Node Path
  const handleExecuteNodePath = async () => {
    const payload = {
      nodePath: nodePath.map((nodeId) => ({
        id: nodeId,
        description: nodes.find((n) => n.id === nodeId)?.data.label || "",
      })),
    };
    // console.log("Node path payload:", payload);
    try {
      // Example of calling some "execute" endpoint
      // Possibly this is not used if you prefer executing the entire playbook
      const response = await axios.post(
        "http://93.127.202.133:5000/execute_node_path",
        payload
      );
      console.log("POST Response:", response.data);
      alert("Execution via node path successful!");
    } catch (error) {
      console.error("Error during node path execution:", error);
      alert("Execution failed!");
    }
  };

  // ==============================
  // Render
  // ==============================
  return (
    <ReactFlow
  ref={ref}
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onEdgesDelete={onEdgesDelete} // Add this line
  onConnect={onConnect}
  onDrop={onDrop}
  onDragOver={(event) => event.preventDefault()}
  onInit={setReactFlowInstance}
  onSelectionChange={onSelectionChange}
>

      {/* LEFT SIDEBAR */}
      <div
        className={`transition-all duration-500 fixed top-0 ${
          isSidebarOpen ? "left-0" : "-left-64"
        } w-64`}
      >
        <div className="relative flex flex-col h-screen px-4 py-8 bg-white border-r">
          <button
            onClick={closeSidebar}
            className="absolute w-8 h-8 text-gray-600 rounded-full top-1 right-1 hover:bg-gray-200 hover:text-gray-800"
          >
            <BiSolidDockLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-700 mb-3">
            LLM <span className="-ml-1 text-pink-500">Autopentester</span>
          </h2>
          <hr className="my-3" />

          {/* CREATE NEW PLAYBOOK */}
          <div className="mb-4">
            <h3 className="font-bold mb-2">Create Playbook</h3>
            <input
              type="text"
              placeholder="Name"
              className="border p-1 rounded w-full mb-2"
              value={newPlaybookName}
              onChange={(e) => setNewPlaybookName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Category"
              className="border p-1 rounded w-full mb-2"
              value={newPlaybookCategory}
              onChange={(e) => setNewPlaybookCategory(e.target.value)}
            />
            <button
              onClick={createNewPlaybook}
              className="w-full bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600"
            >
              Add Playbook
            </button>
          </div>

          {/* SET TARGET IP */}
    <div className="mb-4 bg-gray-100 p-3 rounded">
      <h3 className="font-bold mb-2">Set Target IP</h3>
      <input
        type="text"
        placeholder="IP Address"
        className="border p-1 rounded w-full mb-2"
        value={newIp}
        onChange={(e) => setNewIp(e.target.value)}
      />
      <button
        onClick={handleSetIp}
        className="w-full bg-green-500 text-white py-1 px-2 rounded hover:bg-green-600"
      >
        Set IP
      </button>
    </div>

          {/* LIST OF ALL PLAYBOOKS (AND PLAYS) */}
<div className="flex-1 overflow-y-auto">
  <h3 className="text-lg font-bold text-black">Playbooks</h3>
  <div className="space-y-3 mt-3">
    {playbooks.map((pb, i) => (
      <div key={i} className="border p-2 rounded">
        {/* Playbook Header */}
        <div className="flex items-center justify-between mb-1">
          <strong>{pb.name}</strong>
          <button
            onClick={() => handleExecutePlaybook(pb.id)}
            className="text-sm bg-green-500 text-white px-2 py-0.5 rounded hover:bg-green-600"
          >
            Execute
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Category: {pb.category}
        </p>
        {/* Select playbook (so we can add plays in the right sidebar) */}
        <button
          onClick={() => setSelectedPlaybook(pb)}
          className="text-xs underline text-blue-600"
        >
          View / Edit
        </button>

        {/* Show each play in this playbook as drag blocks */}
        <div className="mt-2 space-y-1">
          {pb.plays?.map((play, idx) => {
            const blockData = {
              id: play.id,
              description: play.description,
              completed: play.completed,
            };
            return (
              <div
                key={idx}
                className="p-1 text-sm bg-gray-100 border rounded cursor-grab hover:bg-gray-200"
                draggable
                onDragStart={(event) =>
                  event.dataTransfer.setData(
                    "application/reactflow",
                    JSON.stringify(blockData)
                  )
                }
              >
                {play.description}
              </div>
            );
          })}
        </div>

        {/* Add New Play Section */}
        {selectedPlaybook?.id === pb.id && (
          <div className="mt-4">
            <h4 className="font-bold text-sm mb-2">Add New Play</h4>
            <input
              type="text"
              placeholder="Play Description"
              className="border p-1 rounded w-full mb-2"
              value={newPlayDescription}
              onChange={(e) => setNewPlayDescription(e.target.value)}
            />
            <button
              onClick={addNewPlay}
              className="w-full bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600"
            >
              Add Play
            </button>
          </div>
        )}
      </div>
    ))}
  </div>
</div>

        </div>
      </div>

      <div className="absolute inset-y-0 right-0 w-80 bg-white border-l border-gray-300 z-50">
  <RightSideBar
    selectedPlaybook={selectedPlaybook}
    setSelectedPlaybook={setSelectedPlaybook}
    shouldPollLogs={shouldPollLogs}      // pass the boolean
    handleExecuteSinglePlay={handleExecuteSinglePlay}
  />
</div>

{/* Node Path Overlay */}
<div
          className="fixed bottom-4 left-50 bg-white border rounded shadow-lg p-4 z-40"
          style={{ width: "500px", maxHeight: "135px", overflowY: "auto" }}
        >
          <h3 className="text-lg font-bold mb-4">Node Path</h3>
          <div className="text-sm text-gray-700 mb-4">
            <pre className="whitespace-pre-wrap">
              {'{'}
              {nodePath.map((nodeId, index) => {
                const nodeLabel = nodes.find((n) => n.id === nodeId)?.data.label;
                return (
                  <div key={index}>
                    &nbsp;&nbsp;{index + 1}: "{nodeLabel}",
                  </div>
                );
              })}
              {'}'}
            </pre>
          </div>
        </div>

        {/* Controls Overlay */}
        <div className="fixed bottom-4 left-[750px] z-50 pointer-events-auto">
          <Controls />
        </div>

          


      {/* BOTTOM RIGHT: Execute Node Path (Optional) */}
      <button
        onClick={handleExecuteNodePath}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-lg z-50"
      >
        Execute Node Path
      </button>

      <MiniMap />
      <Background />
    </ReactFlow>
  );
};

const ReactFlowProviderContent2 = () => {
  const { isSidebarOpen } = useGlobalContext();
  return (
    <ReactFlowProvider>
      <div
        className={`h-[calc(100vh-74px)] flex ${isSidebarOpen ? "ml-64" : ""}`}
      >
        <Content />
      </div>
    </ReactFlowProvider>
  );
};

export default ReactFlowProviderContent2;
//stable 1
