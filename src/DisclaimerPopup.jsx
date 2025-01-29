import React from "react";
import "./DisclaimerPopup.css";

const DisclaimerPopup = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Copyright and Legal Disclaimer:</h2>
        <p className="paragraph" >
          This code is the proprietary and intellectual property of Ahmar Ayaz.
          Unauthorized copying, distribution, or modification is strictly
          prohibited. All Rights Reserved. By proceeding, you acknowledge and agree to these terms.
        </p>
        <button onClick={onClose}>OK</button>
      </div>
    </div>
  );
};

export default DisclaimerPopup;
