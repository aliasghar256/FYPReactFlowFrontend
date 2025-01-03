import React, { useEffect } from "react";

const NodePath = ({
  nodePath,
  getPlayAndPlaybookNames,
  playbooks, // Prop for playbooks
  nodePathVersion
}) => {
  // useEffect to monitor changes in playbooks
  useEffect(() => {
    console.log("Playbooks have changed:", playbooks);

    // Perform any operations whenever playbooks change
    if (playbooks && playbooks.length > 0) {
      console.log("Number of playbooks:", playbooks.length);
    }
  }, [playbooks]); // Dependency array with playbooks

  return (
    <div>
      <div
        className="fixed bottom-4 left-50 bg-white border rounded shadow-lg p-4 z-40"
        style={{ width: "500px", maxHeight: "160px", overflowY: "auto" }}
      >
        <h3 className="text-lg font-bold mb-4">Node Path</h3>
        <div className="text-sm text-gray-700 mb-4">
          <pre className="whitespace-pre-wrap">
            {"{"}
            {nodePath.map((node, index) => {
              const { playbookName, playName } = getPlayAndPlaybookNames(
                node.playbook_id,
                node.play_id
              );
              return (
                <div key={index}>
                  &nbsp;&nbsp;{index + 1}:{" "}
                  {" {"}
                  <span>
                    <strong>Playbook:</strong> {playbookName},{" "}
                    <strong>Play:</strong> {playName}
                  </span>
                  {" }"}
                </div>
              );
            })}
            {"}"}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default NodePath;
