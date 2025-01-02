import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const RightSideBar = ({
  selectedPlaybook,
  setSelectedPlaybook,
  selectedNode,
  shouldPollLogs = false,
  executeSinglePlay,
  handleExecuteSinglePlay,
  removePlay,
}) => {
  const [dockerLogs, setDockerLogs] = useState([]); // Docker logs
  const [contextLogs, setContextLogs] = useState({}); // Context logs mapped by playbooks
  const pollingIntervalRef = useRef(null);

  // Fetch Docker Logs for the Selected Playbook
  const fetchDockerLogs = async () => {
    try {
      const url = `http://93.127.202.133:5000/docker/logs`;
      const response = await axios.get(url);
      setDockerLogs(response.data.logs || []);
    } catch (error) {
      console.error("Error fetching Docker logs:", error);
      setDockerLogs([]);
    }
  };

  // Fetch Context Logs
  const fetchContextLogs = async () => {
    try {
      const url = `http://93.127.202.133:5000/allplaybooks/global_context_log`;
      const response = await axios.get(url);
      setContextLogs(response.data.all_playbooks_global_context_log || {});
    } catch (error) {
      console.error("Error fetching context logs:", error);
      setContextLogs({});
    }
  };

  // Initially fetch logs once if we have a selected playbook
  useEffect(() => {
    if (selectedPlaybook) {
      fetchDockerLogs();
      fetchContextLogs();
    }
  }, [selectedPlaybook]);

  // Whenever shouldPollLogs is true, set up an interval
  useEffect(() => {
    if (shouldPollLogs) {
      // Clear any existing interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // Start polling every 3 seconds (example)
      pollingIntervalRef.current = setInterval(() => {
        fetchDockerLogs();
        fetchContextLogs();
      }, 3000);
    } else {
      // If shouldPollLogs is false, clear the interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    // Cleanup when unmounting
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [shouldPollLogs]);

  return (
    <div style={{ width: "300px", background: "#fafafa", padding: "10px" }}>
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
          height: "300px",
          overflow: "auto",
          marginBottom: "10px",
        }}
      >
        {Object.keys(contextLogs).length > 0 ? (
          Object.entries(contextLogs).map(([playbookId, logs]) => (
            <div key={playbookId} style={{ marginBottom: "10px" }}>
              <h4>Playbook: {playbookId}</h4>
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  style={{ fontSize: "0.85rem", marginBottom: "5px" }}
                >
                  <p>
                    <strong>Play:</strong> {log.play}
                  </p>
                  <p>
                    <strong>Cmd:</strong> {log.command}
                  </p>
                  <pre>
                    <strong>Result:</strong>{" "}
                    {JSON.stringify(log.result, null, 2)}
                  </pre>
                  <pre>
                    <strong>Context:</strong> {log.context}
                  </pre>
                  <hr />
                </div>
              ))}
            </div>
          ))
        ) : (
          <p style={{ fontSize: "0.85rem", color: "#666" }}>
            No context logs available.
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
