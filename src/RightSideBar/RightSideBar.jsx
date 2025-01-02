import React, { useState, useEffect,useRef  } from "react";
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
  const [contextLogs, setContextLogs] = useState([]); // Context logs
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
      const url = `http://93.127.202.133:5000/playbook/${selectedPlaybook.id}/global_context_log`;
      const response = await axios.get(url);
      setContextLogs(response.data.logs || []);
    } catch (error) {
      console.error("Error fetching context logs:", error);
      setContextLogs([]);
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
