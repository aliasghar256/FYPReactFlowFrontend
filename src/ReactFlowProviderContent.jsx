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

  const ref = useRef(null);

  // ==============================
  // Fetch All Playbooks + Plays
  // ==============================
  const fetchAllPlaybooks = async () => {
    try {
      // Example: GET /allplaybooks => { "Nmap_test": {...}, "Gobuster_test": {...} }
      const res = await axios.get("http://127.0.0.1:5000/allplaybooks");
      // Convert object to array if needed
      const normalized = Object.values(res.data); // => [{ name: 'Nmap_test', ...}, { name: 'Gobuster_test', ...}]
      setPlaybooks(normalized);
    } catch (error) {
      console.error("Error fetching playbooks:", error);
    }
  };

  useEffect(() => {
    fetchAllPlaybooks();
  }, []);

  // ==============================
  // Create a new playbook
  // ==============================
  const createNewPlaybook = async () => {
    if (!newPlaybookName || !newPlaybookCategory) return;
    try {
      const payload = {
        name: newPlaybookName,
        category: newPlaybookCategory,
      };
      // POST /playbook
      await axios.post("http://127.0.0.1:5000/playbook", payload);
      await fetchAllPlaybooks();
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
      const url = `http://127.0.0.1:5000/playbook/${selectedPlaybook.name}/play`;
      // POST /playbook/<playbook_name>/play
      await axios.post(url, payload);
      await fetchAllPlaybooks(); // Refresh
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
      const url = `http://127.0.0.1:5000/playbook/${playbookName}/execute_all`;
      const res = await axios.post(url);
      console.log("Execute Playbook:", res.data);
      alert(`Playbook '${playbookName}' executed!`);
    } catch (error) {
      console.error("Error executing playbook:", error);
      alert("Playbook execution failed. See console for details.");
    }
  };

  // ==============================
  // ReactFlow: onConnect
  // ==============================
  const onConnect = async (params) => {
    // Add the edge in the local UI
    setEdges((eds) => {
      const updatedEdges = addEdge(params, eds);
      updateNodePath(updatedEdges);
      return updatedEdges;
    });

    // If you want to also notify your backend that these two plays are connected:
    if (selectedPlaybook) {
      // Typically, the node id => the "play" we dragged
      // Make sure you stored enough info in the node's id/data to connect them.
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (sourceNode && targetNode) {
        try {
          // Example: POST /playbook/<playbook_name>/connect
          // body: { parent_description: '...', child_description: '...' }
          const url = `http://127.0.0.1:5000/playbook/${selectedPlaybook.name}/connect`;
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
  const updateNodePath = (currentEdges) => {
    const path = [];
    const visited = new Set();

    // Only start from nodes that are "sources" in the edges
    const startNodes = nodes.filter((node) =>
      currentEdges.some((edge) => edge.source === node.id)
    );

    const traverse = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      path.push(nodeId);

      // Traverse connected children
      currentEdges
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
    console.log("Node path payload:", payload);
    try {
      // Example of calling some "execute" endpoint
      // Possibly this is not used if you prefer executing the entire playbook
      const response = await axios.post(
        "http://127.0.0.1:5000/playbook/execute",
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
      onConnect={onConnect}
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      onInit={setReactFlowInstance}
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
          <h2 className="text-3xl font-semibold text-gray-700 mb-3">
            Flow <span className="-ml-1 text-pink-500">Chart</span>
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

          {/* LIST OF ALL PLAYBOOKS (AND PLAYS) */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-lg font-bold text-black">Playbooks</h3>
            <div className="space-y-3 mt-3">
              {playbooks.map((pb, i) => (
                <div key={i} className="border p-2 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <strong>{pb.name}</strong>
                    <button
                      onClick={() => handleExecutePlaybook(pb.name)}
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
                        id: `play-${pb.name}-${idx}`,
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR: SELECTED PLAYBOOK DETAILS */}
      {selectedPlaybook && (
        <div className="fixed top-0 right-0 w-64 h-screen bg-white border-l px-4 py-4 overflow-y-auto">
          <h3 className="text-xl font-bold mb-2">
            {selectedPlaybook.name} Details
          </h3>

          {/* ADD A NEW PLAY */}
          <div className="mb-4">
            <h4 className="font-semibold mb-1">Add New Play</h4>
            <input
              type="text"
              placeholder="Play Description"
              className="border p-1 rounded w-full mb-2"
              value={newPlayDescription}
              onChange={(e) => setNewPlayDescription(e.target.value)}
            />
            <button
              onClick={addNewPlay}
              className="bg-blue-500 text-white w-full py-1 px-2 rounded hover:bg-blue-600"
            >
              Add Play
            </button>
          </div>
          {/* Optionally, you could show the list of plays again or more details here. */}
        </div>
      )}

        {/* BOTTOM LEFT: Node Path Display */}
        <div className="fixed bottom-4 left-4 bg-white border rounded p-3 shadow-lg">
          <h3 className="text-lg font-bold mb-2">Node Path</h3>
          <div className="text-sm text-gray-700">
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


      {/* BOTTOM RIGHT: Execute Node Path (Optional) */}
      <button
        onClick={handleExecuteNodePath}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-lg z-50"
      >
        Execute Node Path
      </button>

      <Controls />
      <MiniMap />
      <Background />
    </ReactFlow>
  );
};

const ReactFlowProviderContent = () => {
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

export default ReactFlowProviderContent;
//stable 1
