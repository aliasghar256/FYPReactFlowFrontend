import React, { useCallback, useState, useEffect, useRef } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import axios from "axios";
import { BiSolidDockLeft } from "react-icons/bi";
import { useGlobalContext } from "./context";

const Content = () => {
  const { isSidebarOpen, closeSidebar } = useGlobalContext();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [nodePath, setNodePath] = useState([]); // Ordered list of connected nodes
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const ref = useRef(null);

  // Fetch nodes from the API
  const fetchNodesFromAPI = async () => {
    try {
      const response = await axios.get(
        "http://127.0.0.1:5000/playbook/Nmap_test/dump"
      );
      const { plays } = response.data;

      const blocks = plays.map((play, index) => ({
        id: `block-${index}`,
        description: play.description,
        completed: play.completed,
      }));

      setAvailableBlocks(blocks);
    } catch (error) {
      console.error("Error fetching nodes from API:", error);
    }
  };

  useEffect(() => {
    fetchNodesFromAPI();
  }, []);

  // Add new edges and update nodePath
  const onConnect = (params) => {
    setEdges((eds) => {
      const updatedEdges = addEdge(params, eds); // Allow multiple edges from a single node
      updateNodePath(updatedEdges);
      return updatedEdges;
    });
  };

  // Update the path of connected nodes (supports branches)
  const updateNodePath = (currentEdges) => {
    const path = [];
    const visited = new Set();

    // Start traversal only from nodes that are sources in the edges
    const startNodes = nodes.filter((node) =>
      currentEdges.some((edge) => edge.source === node.id)
    );

    const traverse = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      path.push(nodeId);

      // Traverse to connected nodes
      currentEdges
        .filter((edge) => edge.source === nodeId)
        .forEach((edge) => traverse(edge.target));
    };

    startNodes.forEach((node) => traverse(node.id));
    setNodePath(path);
  };

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

    const newNode = {
      id: blockData.id,
      position,
      data: { label: blockData.description },
      style: { background: blockData.completed ? "#A7F3D0" : "#FCA5A5" },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const handleExecute = async () => {
    const payload = {
      nodePath: nodePath.map((nodeId) => ({
        id: nodeId,
        description: nodes.find((n) => n.id === nodeId)?.data.label || "",
      })),
    };
    console.log("Payload:", payload);
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/playbook/execute",
        payload
      );
      console.log("POST Response:", response.data);
      alert("Execution Successful!");
    } catch (error) {
      console.error("Error during execution:", error);
      alert("Execution Failed! Check the console for details.");
    }
  };

  return (
    <ReactFlow
      ref={ref}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect} // Supports multiple edges
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      onInit={setReactFlowInstance}
    >
      {/* Left Panel */}
      <div
        className={`transition-all duration-500 fixed top-0 ${
          isSidebarOpen ? "left-0" : "-left-64"
        }`}
      >
        <div className="relative flex flex-col w-64 h-screen px-4 py-8 bg-white border-r">
          <button
            onClick={closeSidebar}
            className="absolute w-8 h-8 text-gray-600 rounded-full top-1 right-1 hover:bg-gray-200 hover:text-gray-800"
          >
            <BiSolidDockLeft className="w-5 h-5" />
          </button>
          <h2 className="text-3xl font-semibold text-gray-700">
            Flow <span className="-ml-1 text-pink-500">Chart</span>
          </h2>
          <hr className="my-3" />

          {/* Render Blocks */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-lg font-bold text-black">Available Nodes</h3>
            <div className="space-y-3 mt-3">
              {availableBlocks.map((block) => (
                <div
                  key={block.id}
                  className="p-2 text-sm text-center bg-gray-100 border rounded cursor-grab hover:bg-gray-200"
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData(
                      "application/reactflow",
                      JSON.stringify(block)
                    )
                  }
                >
                  {block.description}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Execute Button */}
      <button
        onClick={handleExecute}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-lg z-50"
      >
        Execute
      </button>

      {/* Node Path Display */}
      <div className="fixed bottom-4 left-4 bg-white border rounded p-3 shadow-lg">
        <h3 className="text-lg font-bold mb-2">Node Path</h3>
        <ul className="text-sm text-gray-700">
          {nodePath.map((nodeId, index) => (
            <li key={index}>
              {index + 1}. {nodes.find((n) => n.id === nodeId)?.data.label}
            </li>
          ))}
        </ul>
      </div>

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
      <div className={`h-[calc(100vh-74px)] flex ${isSidebarOpen ? "ml-64" : ""}`}>
        <Content />
      </div>
    </ReactFlowProvider>
  );
};

export default ReactFlowProviderContent;
