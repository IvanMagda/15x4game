

var Player = {

    volunteers: 0,
    volunteers_memory: 0,

    // C1 resources
    culture: 0,
    culture_soft_cap: 0,
    culture_rate: 0,

    // C2 resources
    cultural_approval: 0,
    cultural_concept: 0,
    cultural_project: 0,
    cultural_reform: 0,

    knowledge: 0,
    max_knowledge: 0, // ?)

    action_points: 0,

    // R1 resources
    likes: 0,
    design: 0,
    money: 0,
    ideas: 0,

    departments: {'smm': new Department('smm'), 'design': new Department('design'), 'site': new Department('site'), 'docs': new Department('docs')},

    // skills
    writing: 0,
    drawing: 0,
    programming: 0,
    management: 0,

    // Reputation
    kindness: 1,
    generosity: 1,
    thoughtfulness: 1,
    innovativeness: 1,

    found_secrets: [],

    unit: new Unit(),

    ship: new Ship(),
    conventional_units: 100000,

    race_win_points: 0,
    race_win_points_memory: 0,

    td_trophy: 0
};

Player.addSupervision = function (department_name) {
    this.departments[department_name].isSupervision = 1;
    this.departments[department_name].setSupervision(this[this.departments[department_name].multiplying_skill]);
};
Player.unit.team = 'ally';
Player.unit.symbol = 'P';

Player.seek = function() {
    var inflow = 1 / (0.05 * 0.01 * Math.pow(this.volunteers_memory, 4) + 1);

    if (this.volunteers_memory > 3) Player.revealSecret('culture');
    Gatherer.found(inflow);

    this.volunteers += inflow;
    this.volunteers_memory += inflow;
    draw_all();
};

Player.reset = function () {
    this.volunteers = 0;
    this.volunteers_memory = 0;
    localStorage.removeItem('Player');
};

Player.shareKnowledge = function() {
    if (this.knowledge >= 1) {
        Gatherer.found(1);
        this.knowledge--;
        this.volunteers++;
        this.volunteers_memory++;
        message("You share knowledge and found a volunteer.");
    }
    else {
        message("Not enough knowledge.");
    }
};

Player.increaseDepartment = function(department) {
    this.departments[department].increase();
};

Player.decreaseDepartment = function(department) {
    this.departments[department].decrease();
};

Player.upgradeDepartment = function(department) {
    this.departments[department].upgrade();
};

Player.getUpgradeCostDepartment = function(department) {
    return this.departments[department].getUpgradeCost();
};

Player.getDepartmentEfficiency = function(department) {
    return this.departments[department].getEfficiency();
};

Player.getDepartmentProductivity = function(department) {
    return this.departments[department].getProductivity();
};

Player.harvest = function () {
    for (var key in Player.departments) {
        var department = Player.departments[key];
        var resources = {'smm': 'likes', 'design': 'design', 'site': 'money', 'docs': 'ideas'}[key];
        if (this.getDepartmentProductivity(key)) {
            Player.reward(resources, this.getDepartmentProductivity(key), 1);
        }
    }
};

Player.revealSecret = function(secret) {
    if (this.found_secrets.indexOf(secret) == -1) {
        this.found_secrets.push(secret);
        var secret_container = document.getElementById(secret + '_container');
        if (secret_container && secret_container.style.display != 'block') {
            secret_container.style.display = 'block';
        }
        //document.getElementById(secret + '_container').style.display = 'block';
    }
};

Player.checkReputation = function(reputation, silent) {
    if (random(0, 100) < this[reputation]) {
        if (!silent) message({
            "kindness": "Affected your kindness, you refuse to take payment. You knowledge have to take these resources for free.",
            "generosity": "The fame of your generosity reaches many. You give twice as much resources.",
            "thoughtfulness": "Thoughtfulness led to enlightenment. Knowledge came looking for you.",
            "innovativeness": "Thanks to your innovative thinking, you can make twice as much experience."
        }[reputation]);
        return true;
    }
    return false;
};

Player.learn = function(skill, quantity) {
    if (quantity > 0) this.revealSecret('actions');

    if (this.checkReputation('innovativeness')) quantity *= 2;

    var new_quantity = Math.min(quantity, 60 - this[skill]);
    this[skill] += new_quantity;
    this.action_points += quantity;
    message("Learned " + new_quantity.toFixed(2) + " of " + skill + ". Added " + quantity.toFixed(2) + " action points.");
    Gatherer.increaseSkill(skill, new_quantity);
    draw_all();
};

Player.reward = function(resource, quantity, silent) {
    if (quantity <= 0) return false;
    if (this.checkReputation('generosity', silent)) quantity *= 2;

    if (resources.indexOf(resource) != -1) {
        Player.revealSecret('resources'); 
        Player.revealSecret('events');
        var limited_quantity = Math.min(quantity, this.getLimit(resource) - this[resource]);
        if(this[resource] < this.getLimit(resource)) {
            this[resource] += Math.min(quantity, this.getLimit(resource) - this[resource]);
        }
    }
    else {
        this[resource] += quantity;
    }

    Gatherer.increaseResource(resource, limited_quantity);

    if (!silent) message("Gained " + quantity.toFixed(2) + " of " + resource);
};

Player.getLimit = function (resource) {
    if (resources.indexOf(resource) == -1) return Infinity;

    var storage_t1 = (Storages.buildings.tier1[resource].level - 1) * resources_rates[resource];
    var storage_t2 = (Storages.buildings.tier2[resource].level - 1) * 2 * resources_rates[resource];
    var storage_t3 = (Storages.buildings.tier3[resource].level - 1) * 3 * resources_rates[resource];
    var storage_t4 = (Storages.buildings.tier4[resource].level - 1) * 4 * resources_rates[resource];

    return (resources_base_limits[resource] + storage_t1 + storage_t2 + storage_t3 + storage_t4) * (1 + (Civilization.updates.sharing.level * 0.01));
};

Player.withdraw = function(resource, quantity, silent) {
    if (this[resource] - quantity < 0) {
        return false;
    }
    this[resource] -= quantity;
    if (!silent) message("Paid " + quantity.toFixed(2) + " of " + resource);
    Gatherer.decrease(resource, quantity);
//    draw_all();
    return true;
};

Player.paid = function(resource, quantity) {
    this[resource] -= quantity;
    message("Paid " + quantity.toFixed(2) + " of " + resource);
    Gatherer.decrease(resource, quantity);
//    draw_all();
};

Player.withdrawArray = function(array) {
  //  console.log(array);

    var cost_checked = 1;
    for (var key in array) {
        if (!(Player[key] >= array[key])) {
            cost_checked = 0;
            message("Not enough " + key + ".");
        }
    }

    if (cost_checked) {
        for (var key in array) {
            Player.withdraw(key, array[key]);
        }
//        draw_all();
        return true;
    }
    return false;
};


Player.countSelfStudyQuantity = function(skill){
    return 2 - (2*(this[skill] / 60));
};

Player.countBooksQuantity = function(){
    return 2 - (2*(Gatherer.events.learn.books / 60));
};

Player.countWorkQuantity = function(skill){
    return Math.max(0, 2*Math.sin(this[skill]/(Math.PI*6)));
};

Player.countPetProjectQuantity = function(skill){
    return (this[skill]*this[skill]/60/60)*2;
};

Player.countQuantity=function(skill,btnName){
    switch(btnName){
        case "Self-study":
            return Player.countSelfStudyQuantity(skill);
            break;
        case "Books":
            return Player.countBooksQuantity();
            break;
        case "Work":
            return Player.countWorkQuantity(skill);
            break;
        case "Pet-project":
            return Player.countPetProjectQuantity(skill);
            break;
    }
};

Player.selfStudy = function(skill) {
    if (this.knowledge < 1) {
        message("You are weak-knowledgeed for study.");
        return false;
    }

    if (!this.checkReputation('thoughtfulness')) this.knowledge--;

    message("You studied " + skill + " yourself.");
    this.learn(skill, Player.countSelfStudyQuantity(skill));
    Gatherer.learn("selfStudy");

    this.departments[skills_departments[skill]].setSupervision(this[skill]);
};

Player.books = function(skill) {
    if (this.knowledge < 1) {
        message("You are weak-knowledgeed for reading.");
        return false;
    }
    if (!this.checkReputation('thoughtfulness')) this.knowledge--;
    message("You read book about " + skill + ".");
    this.learn(skill, Player.countBooksQuantity());
    Gatherer.learn("books");

    this.departments[skills_departments[skill]].setSupervision(this[skill]);
};

Player.work = function(skill) {
    if (this.knowledge < 1) {
        message("You are weak-knowledgeed for the job.");
        return false;
    }
    if (!this.checkReputation('thoughtfulness')) this.knowledge--;

    switch(skill) {
        case "writing":
            message("You worked as a copywriter.");
            this.reward("money", Math.max(this[skill], 0));
            break;
        case "drawing":
            message("You worked as a designer.");
            this.reward("money", Math.max((this[skill]*2)-30, 0));
            break;
        case "programming":
            message("You worked as a coder.");
            this.reward("money", Math.max((this[skill]*4)-120, 0));
            break;
        case "management":
            message("You worked as a PM.");
            this.reward("money", Math.max((this[skill]*10)-450, 0));
            break;
    }

    message("You learned some " + skill + " on the job.");
    this.learn(skill, Player.countWorkQuantity(skill));
    Gatherer.learn("work");

    this.departments[skills_departments[skill]].countOfWork ++;
    this.departments[skills_departments[skill]].setSupervision( this[skill]);
};

Player.petProject = function(skill) {
    if (this.knowledge < 1) {
        message("You are weak-knowledgeed for working.");
        return false;
    }
    if (!this.checkReputation('thoughtfulness')) this.knowledge--;

    message("You studied " + skill + " working on your pet-project.");

    this.learn(skill, Player.countPetProjectQuantity(skill));
    Gatherer.learn("petProject");

    // ADD (1/10)% chance to achieve your startup company
    if (rand(1, 10) == 7) {
        startups.found(skill);
        message("You have successfully founded a startup!");
    }

    this.departments[skills_departments[skill]].setSupervision(this[skill]);
};
