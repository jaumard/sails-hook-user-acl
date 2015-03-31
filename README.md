# sails-hook-user-acl
Hook to manage basic user ACL. 
You can secure all routes (config/routes.js or rest url), define some rules to test it in your own code and secure some assets (js, css, pdf...). 

##Installation
    npm install sails-hook-user-acl
Don't use sudo or config/acl.js will be create as root user and not editable

##Configure
Create or modify config/acl.js : 

    module.exports.acl = {
        //Current user role access, default in session.role
        "currentRole"   : "session.role",
        "roles"         : ["user", "admin"],//Default roles in application
        "defaultPolicy" : "allow",//Default policy allow or deny, if no acl was define for a route or rule this is the default behavior
        "defaultRole"   : "user",//Default role when user is not logged at all
        "onForbidden"   : function (req, res)
        {
            if (req.wantsJSON)
            {
                res.status(403).json();
            }
            else
            {
                res.forbidden();
            }
            console.log("forbidden");
        },
        "rules"         : {//Custom ACL rules if you want to check access under controller / services
            "saveFile" : {//For example you can call sails.hook.acl.isAllow("admin", "saveFile")
                "roles" : ["admin"]
            }
        },
        "routes"        : //Additional route that are not under config/routes, can be used to protect assets files, but also rest url
        {
            /* Examples
             "GET /user" : {
             "roles" : ["user", "admin"]
             },
             "GET /user/:id" : {
             "roles" : ["user", "admin"]
             },
             "POST /user" : {
             "roles" : ["admin"]
             },
             "PUT /user/:id" : {
             "roles" : ["admin"]
             },
             "DELETE /user/:id" : {
             "roles" : ["admin"]
             },
             "/js/admin.js"    : {
             "roles" : ["admin"]
             }
             */
        }
    };
You can also configure ACL for basic routes under config/routes.js : 


    '/' : {
       view       : 'homepage' //Accessible to anyone
    },
    '/office' : {
       controller : 'OfficeController',
       action     : "home",
       roles      : ["admin"]//Accessible only for admin
    }
    
##Usage
Create a user model the way you want to, for example : 
    
    module.exports = {
      attributes   : {
        name      : 'string',
        role      : {
          type     : "string",
          required : true,
          enum     : ['user', 'admin'] // or sails.config.acl.roles
        }
      }
    };
    
When your user is logged put the user role in session (and don't forget to remove it on log out) and don't forget to set currentRole under config/acl.js : 

    session.role = user.role;

Now all it's automatic for all routes you have configure under config/routes.

But if you want to use/check ACL manually (rules under config/acl.js), just do : 

    sails.hook.acl.isAllow(ROLE, RESOURCE)
Example under a controller : 

    myControllerFunction : function (req, res)
    {
        User.findOneById(req.param("id")).exec(function(err, user)
        {
            if(err)
            {
                console.log("Error");
            }
            else
            {   
                //Here is the ACL verification !
                 if(sails.hook.acl.isAllow(user.role, "saveFile"))
                 {
                    //Upload file user is allowed
                 }
                 else
                 {
                    res.forbidden();
                 }
            }
        });
       
    }

