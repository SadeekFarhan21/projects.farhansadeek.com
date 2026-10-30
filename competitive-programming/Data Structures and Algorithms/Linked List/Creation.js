class Node {
    constructor(val){
        this.val = val;
        this.next = undefined;
    }
}

const a = new Node('A');
const b = new Node('B');
const c = new Node('C');
const d = new Node('D');

a.next = b;
b.next = c;
c.next = d;
d.next = null;

const printLinkedList = (head) => {
    var current = head;
    while(head !== null){
        console.log(current.val);
        current = current.next;
    }
};
printLinkedList(a);