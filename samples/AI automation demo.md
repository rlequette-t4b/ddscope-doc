# AI Assistant — Automation Demo

Open projet *AI automation demo*

**Project specific instructions:**
```
feeding rules

When creating a customer always add a warehouse feeding it in the same lane with name WH customer name ,  there is a flow between the feeding warehouse and the customer

Any flow for a customer should go actually to it's feeding warehouse if it exist

production backup rules

when creating a production node always add a backup node with same type in same lane with a bidirectional link

any flow coming to or leaving a production facility with a backup should be duplicated to or from the backup
```



**User:**
```
customers C1 to C5
```

**Assistant:** User wants to create customers C1 to C4. I'll create four customer nodes with names C1, C2, C3, and C4. Based on the node types, CUSTOMER nodes should be placed in the DELIVER swim lane (id: 1).

---


**User:**
```
tag C1 to C3 as domestic others as export
```

**Assistant:** User wants to tag customers C1, C2, and C3 as 'local' and the remaining customers (C4 and C5) as 'export'. I need to update each node with the appropriate tag.

---

**User:**
```
finished goods FG domestic and FG export connected to matching customers
```

**Assistant:** User wants to create two finished goods products (FG local and FG export) and connect them to the matching customers based on their tags. C1, C2, C3 are tagged 'local' and C4, C5 are tagged 'export'. I'll create the two products, create product nodes for each, and add flows from the product nodes to the appropriate customers.

---

**User:**
```
production line makes all finished goods
```

**Assistant:** I understand the user wants to create a production line that produces both finished goods (FG local and FG export). I'll create a production line node in the MAKE swim lane, add flows from this production line to both FG product nodes, create SKUs for both products on the production line, and set up BOMs showing the production line outputs both finished goods.

---

**User:**
```
add raw material feeding production line source from a chinese supplier, show the product as a node on the supply flow in the same lane as the line
```

**Assistant:** I understand the user wants to add a raw material that feeds the production line, sourced from a Chinese supplier. I'll create a raw material product, a Chinese supplier node in the SOURCE swim lane, create flows from the supplier to the production line, add SKUs for the raw material on both nodes, and add the raw material as a component to both BOMs on the production line.


---
