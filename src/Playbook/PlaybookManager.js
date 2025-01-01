import Play from './Play';
import Playbook from './Playbook';
import axios from 'axios';

export const deserializePlaybooks = (data) => {
  return Object.values(data).map(
    (playbook) =>
      new Playbook({
        id: playbook.id,
        name: playbook.name,
        category: playbook.category,
        ip: playbook.ip,
        plays: playbook.plays.map((play) => ({
          id: play.id,
          playbookName: play.playbook_name,
          description: play.description,
          completed: play.completed,
          context: play.context,
          result: play.result,
          backwardLinks: play.backward_links,
          forwardLinks: play.forward_links,
          ip: play.ip,
        })),
      })
  );
};
export const serializePlaybooks = (playbooks) => {
    const data = {};
    playbooks.forEach((playbook) => {
      data[playbook.id] = {
        id: playbook.id,
        name: playbook.name,
        category: playbook.category,
        ip: playbook.ip,
        plays: playbook.plays.map((play) => ({
          id: play.id,
          playbook_name: play.playbookName,
          description: play.description,
          completed: play.completed,
          context: play.context,
          result: play.result,
          backward_links: play.backwardLinks,
          forward_links: play.forwardLinks,
          ip: play.ip,
        })),
      };
    });
    return data;
};
export const fetchAllPlaybooks = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/allplaybooks");
      const playbooks = deserializePlaybooks(res.data); // Deserialize response
      console.log("Deserialized Playbooks:", playbooks); // Log for debugging
      return playbooks; // Return the deserialized playbooks
    } catch (error) {
      console.error("Error fetching playbooks:", error);
      return null; // Return null or an empty array in case of an error
    }
  };
  
// module.exports = { deserializePlaybooks, serializePlaybooks, fetchAllPlaybooks };