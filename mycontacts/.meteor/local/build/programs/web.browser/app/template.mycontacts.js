(function(){
Template.body.addContent((function() {
  var view = this;
  return HTML.CENTER("\n  			", HTML.H1(Blaze._TemplateWith(function() {
    return {
      align: Spacebars.call(view.lookup("right"))
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("loginButtons"));
  })), "\n  	", HTML.DIV("\n  		", HTML.HEADER("\n  				", HTML.Raw("<h1>Welcome to Contacts!</h1>"), "\n  					", Blaze.If(function() {
    return Spacebars.call(view.lookup("currentUser"));
  }, function() {
    return [ "\n  			", HTML.SECTION({
      "class": "main"
    }, "\n				", HTML.FORM({
      "class": "form-1",
      enctype: "multipart/form-data"
    }, "\n                \n                	", HTML.P({
      "class": "field"
    }, "\n						", HTML.INPUT({
      type: "text",
      name: "name",
      value: function() {
        return Spacebars.mustache(view.lookup("editname"));
      },
      placeholder: "Name",
      required: ""
    }), "\n						", HTML.I({
      "class": "icon-user icon-large"
    }), "\n					"), "\n					", HTML.P({
      "class": "field"
    }, "\n						", HTML.INPUT({
      type: "text",
      name: "mobile",
      value: function() {
        return Spacebars.mustache(view.lookup("editmobile"));
      },
      placeholder: "Mobile No",
      required: ""
    }), "\n						", HTML.I({
      "class": "icon-user icon-large"
    }), "\n					"), "\n					", HTML.P({
      "class": "field"
    }, "\n						", HTML.INPUT({
      type: "text",
      name: "email",
      value: function() {
        return Spacebars.mustache(view.lookup("editemail"));
      },
      placeholder: "Email id",
      required: ""
    }), "\n						", HTML.I({
      "class": "icon-user icon-large"
    }), "\n					"), "\n					", HTML.P({
      "class": "field"
    }, "\n						", HTML.INPUT({
      type: "text",
      name: "address",
      value: function() {
        return Spacebars.mustache(view.lookup("editaddress"));
      },
      placeholder: "Address",
      required: ""
    }), "\n						", HTML.I({
      "class": "icon-user icon-large"
    }), "\n						"), "\n					", HTML.P({
      "class": "field"
    }, "	\n						", HTML.H3("Upload Image")), "\n						*only .jpg file\n						", HTML.LABEL({
      "for": "file"
    }, "Filename:"), "\n						", HTML.INPUT({
      type: "file",
      name: "file",
      id: "file"
    }), HTML.BR(), "\n					\n						\n					", HTML.P({
      "class": "submit"
    }, "\n						", HTML.BUTTON({
      type: "submit",
      name: "submit",
      onclick: "validate()"
    }, HTML.I({
      "class": "icon-arrow-right icon-large"
    })), "\n\n					"), "\n					\n				"), "\n				", HTML.P({
      "class": "field"
    }, "\n						", HTML.BUTTON({
      "class": "edit",
      name: "edit"
    }, "Edit checked contact"), "\n						", HTML.I({
      "class": "icon-user icon-large"
    }), "\n						"), "\n						\n\n			"), "\n			" ];
  }), "\n  		"), "	\n  	"), "\n  \n  	\n  	", HTML.DIV({
    "class": "contacts"
  }, "	\n  		", Blaze.Each(function() {
    return Spacebars.call(view.lookup("contacts_db"));
  }, function() {
    return [ "\n  		", HTML.UL("\n  		", Spacebars.include(view.lookupTemplate("contact")), "\n  		\n  		"), "\n\n  		" ];
  }), "\n  		\n  	"), "\n\n  \n");
}));
Meteor.startup(Template.body.renderToDocument);

Template.__checkName("contact");
Template["contact"] = new Template("Template.contact", (function() {
  var view = this;
  return [ HTML.Raw('<input type="radio" name="editcon" class="editcon">Edit this\n	'), HTML.LI("Name:", Blaze.View("lookup:name", function() {
    return Spacebars.mustache(view.lookup("name"));
  })), "\n	", HTML.LI("Mobile no:", Blaze.View("lookup:mobile", function() {
    return Spacebars.mustache(view.lookup("mobile"));
  })), "\n	", HTML.LI("Email id:", Blaze.View("lookup:email", function() {
    return Spacebars.mustache(view.lookup("email"));
  })), "\n	", HTML.LI("Address:", Blaze.View("lookup:address", function() {
    return Spacebars.mustache(view.lookup("address"));
  })), HTML.Raw('\n 	\n\n 	<button class="delete" name="delete">Delete</button>') ];
}));

})();
