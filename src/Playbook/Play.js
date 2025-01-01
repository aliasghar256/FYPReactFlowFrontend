class Play {
    constructor({
      id,
      playbookName,
      description,
      completed,
      context,
      result,
      backwardLinks,
      forwardLinks,
      ip,
    }) {
      this.id = id;
      this.playbookName = playbookName;
      this.description = description;
      this.completed = completed;
      this.context = context;
      this.result = result;
      this.backwardLinks = backwardLinks;
      this.forwardLinks = forwardLinks;
      this.ip = ip;
    }
  }
  
  export default Play;
  