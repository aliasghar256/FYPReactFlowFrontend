import Play from './Play';

class Playbook {
  constructor({ id, name, category, ip, plays }) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.ip = ip;

    // Map the `plays` array to instances of the `Play` class
    this.plays = plays.map((play) => new Play(play));
  }
}

export default Playbook;