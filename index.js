import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import ejs from "ejs";
import _ from "lodash";


const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://kreidyde:d81eF7p3PaJPm2fK@cluster0.ucry92v.mongodb.net/todolistDB");

const itemsSchema = {
  name: String
};

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Complete the coding challenge"
});

const item2 = new Item({
  name: "Work on your GED Science today"
});

const item3 = new Item({
  name: "Meditate and do your Gratitude exercises"
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

// Function to insert default items if no items are found
const insertDefaultItems = async () => {
  const count = await Item.countDocuments();
  if (count === 0) {
    Item.insertMany(defaultItems)
      .then(() => console.log("Successfully saved default items to DB."))
      .catch(err => console.log(err));
  }
};

insertDefaultItems();

let workItems = [];
let lastDate;
let day;
app.get("/", async (req, res) => {
  try {
    const foundItems = await Item.find({});
    const now = new Date();
    const options = {
      weekday: "long",
      day: "numeric",
      month: "long",
    };
    const day = now.toLocaleDateString("en-US", options);
    res.render("list.ejs", {
      listTitle: day,
      newListItems: foundItems
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error retrieving items from database.");
  }
});

app.get("/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({name: customListName})
    .then(foundList => {
      if (!foundList){
       //Create a new list
       const list = new List({
        name: customListName,
        items: defaultItems
      });
    
      list.save();
      res.redirect("/" + customListName);
      } else {
        //Show an existing list
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    })
    .catch(err => {
      console.error("Error:", err);
    });

});


app.post("/", async (req, res) => {
  try {
    const itemName = req.body.newItem;
    const listName = req.body.list;

    const item = new Item({
      name: itemName
    });

    if (listName === day) {
      await item.save();
      res.redirect("/");
    } else {
      const foundList = await List.findOne({ name: listName });
      if (foundList) {
        foundList.items.push(item);
        await foundList.save();
        res.redirect("/" + listName);
      } else {
        console.log("List not found.");
        res.redirect("/");
      }
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});


app.post('/delete', async (req, res) => {
  try {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    if (listName === day) {
      await Item.findByIdAndDelete(checkedItemId);
      res.redirect('/');
    } else {
      const updatedList = await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkedItemId } } },
        { new: true }
      );
      if (!updatedList) {
        console.log("List not found.");
        res.redirect('/');
      } else {
        res.redirect('/' + listName);
      }
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});



app.post("/work", (req, res) => {
  const item = req.body.newItem;
  workItems.push(item);
  res.redirect("/work");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
