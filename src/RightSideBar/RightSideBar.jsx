import React, { useState, useEffect } from "react";
import axios from "axios";

const RightSideBar = ({
  selectedPlaybook,
  setSelectedPlaybook,
  selectedNode,
  executeSinglePlay,
  removePlay,
}) => {
  const [dockerLogs, setDockerLogs] = useState([]); // Docker logs
  const [contextLogs, setContextLogs] = useState([]); // Context logs

  // Fetch Docker Logs for the Selected Playbook
  const fetchDockerLogs = async () => {
    if (!selectedPlaybook) return;

    try {
      const url = `http://93.127.202.133:3000/playbook/${selectedPlaybook.id}/logs`;
      const response = await axios.get(url);
      setDockerLogs(response.data.logs || []);
    } catch (error) {
      console.error("Error fetching Docker logs:", error);
      setDockerLogs([]);
    }
  };

  // Fetch Context Logs
  const fetchContextLogs = async () => {
    if (!selectedPlaybook) return;

    try {
      const url = `http://93.127.202.133:3000/playbook/${selectedPlaybook.id}/context_logs`;
      const response = await axios.get(url);
      setContextLogs(response.data.logs || []);
    } catch (error) {
      console.error("Error fetching context logs:", error);
      setContextLogs([]);
    }
  };

  useEffect(() => {
    if (selectedPlaybook) {
      fetchDockerLogs();
      fetchContextLogs();
    }
  }, [selectedPlaybook]);

  if (!selectedPlaybook) {
    return (
      <div style={{ width: "300px", background: "#fafafa", padding: "10px" }}>
        <h3>No Playbook Selected</h3>
        <p style={{ fontSize: "0.85rem", color: "#666" }}>
          Select a playbook to view details.
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: "300px", background: "#fafafa", padding: "10px" }}>
      {/* Display the selected playbook name */}
      <h2 style={{ textAlign: "center", color: "#333" }}>
        {selectedPlaybook.name}
      </h2>
      <h3>Docker Logs</h3>
      <div
        style={{
          border: "1px solid #999",
          height: "200px",
          overflow: "auto",
          marginBottom: "10px",
        }}
      >
        {dockerLogs.length > 0 ? (
          dockerLogs.map((log, idx) => (
            <div key={idx}>
              <strong>{log.command}</strong>
              <pre>{log.output}</pre>
              <hr />
            </div>
          ))
        ) : (
          <p style={{ fontSize: "0.85rem", color: "#666" }}>No Docker logs yet</p>
        )}
      </div>

      <h3>Context Logs</h3>
      <div
        style={{
          border: "1px solid #999",
          height: "150px",
          overflow: "auto",
          marginBottom: "10px",
        }}
      >
        {contextLogs.length > 0 ? (
          contextLogs.map((c, idx) => (
            <div key={idx} style={{ fontSize: "0.85rem", marginBottom: "5px" }}>
              <p>
                <strong>Play:</strong> {c.play}
              </p>
              <p>
                <strong>Cmd:</strong> {c.command}
              </p>
              <pre>{JSON.stringify(c.result, null, 2)}</pre>
              <pre>{c.context}</pre>
              <hr />
            </div>
          ))
        ) : (
          <p style={{ fontSize: "0.85rem", color: "#666" }}>
            No context logs for selected PB
          </p>
        )}
      </div>

      {selectedNode && (
        <div style={{ border: "1px solid #ccc", padding: "5px" }}>
          <h4>Selected Node</h4>
          <p>
            <strong>ID:</strong> {selectedNode.id}
          </p>
          <p>
            <strong>Description:</strong> {selectedNode.data.label}
          </p>
          <button
            style={{ marginRight: "8px" }}
            onClick={() =>
              executeSinglePlay(
                selectedNode.data.playbook_id,
                selectedNode.id
              )
            }
          >
            Execute Play
          </button>
          <button
            onClick={() =>
              removePlay(selectedNode.data.playbook_id, selectedNode.id)
            }
          >
            Remove Play
          </button>
        </div>
      )}
    </div>
  );
};

export default RightSideBar;
