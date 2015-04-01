(function(){
Contacts_db=new Mongo.Collection('contacts_db');
var id="";
var name;
var mobile;
var email;
var address;
var editstatus=false;
if (Meteor.isClient) {
  Session.setDefault('edname', "");
  Session.setDefault('edmobile', "");
  Session.setDefault('edemail', "");
  Session.setDefault('edaddress', "");
 
Template.body.helpers({
    
    contacts_db:function(){
  
      return Contacts_db.find({owner:Meteor.userId()});
    },
    editname:function(){
      return Session.get('edname')
    },
    editmobile:function(){
      return Session.get('edmobile')
    },
    editemail:function(){
      return Session.get('edemail')
    },
    editaddress:function(){
      return Session.get('edaddress')
    },

  
  });
  

Template.body.events({



    'submit .form-1':function(event){
      var status=false;
      name=event.target.name.value;
      mobile=event.target.mobile.value;
      email=event.target.email.value;
      address=event.target.address.value;
      var profile_image=new Image();
      profile_image.src=event.target.file.value;
      var atpos=email.indexOf("@");
      var dotpos=email.indexOf(".");
     if(Match.test(name,String)){
     if(  Match.test(mobile,String)&&(mobile.length==10)&&!(isNaN(mobile))){
      if(  Match.test(email,String)&&atpos>=1&&(dotpos-atpos)>=2){
      if(  Match.test(address,String)){
    status=true;
  if(!editstatus){
    Contacts_db.insert({
        name:name,
        mobile:mobile,
        email:email,
        address:address,
        createdAt:new Date(),
        owner:Meteor.userId(),
        username:Meteor.user().username,
        pic:profile_image
      });
  }
  else{
        Contacts_db.update(id,{
            $set:{'name':name,
                  'mobile':mobile,
                  'email':email,
                  'address':address
          }
        });
        editstatus=false;
  }



      alert("Successfully inserted");

      event.target.name.value="";
      event.target.mobile.value="";
      event.target.email.value="";
      event.target.address.value="";
      



  }}}}
    if(!status)
    alert('Invalid Input');          


      return false;


    },
    'click .edit':function(event,template){
        var editname;
        var editmobile;
        var editemail;
        var editaddress;
       var update=Contacts_db.find({_id:id});
      update.forEach(function(post){

         editname=post.name;
         editmobile=post.mobile;
         editemail=post.email;
         editaddress=post.address;

      });
      Session.set('edname',editname);
      Session.set('edmobile',editmobile);
      Session.set('edemail',editemail);
      Session.set('edaddress',editaddress);
      
      editstatus=true;
      
    return false;

    }

  });
Template.contact.events({
  'click .delete':function(){
    Contacts_db.remove(this._id);
    alert("Contact Deleted ");
  },
  'click .editcon':function(){
     id=this._id;
    
  }


});      




Accounts.ui.config({
  passwordSignupFields:'USERNAME_ONLY'
});




}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}

})();
