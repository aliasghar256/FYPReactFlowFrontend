import React, { useState, useEffect } from "react";
import Home from "./Home";
import DisclaimerPopup from "./DisclaimerPopup";

function App() {
  const [showModal, setShowModal] = useState(true);

  const closeModal = () => {
    setShowModal(false);
  };

  useEffect(() => {
    const acceptedDisclaimer = localStorage.getItem("disclaimerAccepted");
    if (!acceptedDisclaimer) {
      setShowModal(true);
    }
  }, []);

  return (
    <>
      {showModal && <DisclaimerPopup onClose={closeModal} />}
      <Home />
    </>
  );
}

export default App;
