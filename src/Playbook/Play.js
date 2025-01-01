class Play {
  constructor({
    id,
    playbook_name, // API: playbook_name
    description,
    completed,
    context,
    result,
    backward_links, // API: backward_links
    forward_links, // API: forward_links
    ip,
  }) {
    this.id = id;
    this.playbookName = playbook_name; // Map playbook_name → playbookName
    this.description = description;
    this.completed = completed;
    this.context = context;
    this.result = result;
    this.backwardLinks = backward_links || []; // Map backward_links → backwardLinks
    this.forwardLinks = forward_links || []; // Map forward_links → forwardLinks
    this.ip = ip;
  }
}

export default Play;
