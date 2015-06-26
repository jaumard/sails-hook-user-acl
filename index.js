/**
 * Created by jaumard on 28/03/2015.
 */

module.exports = function aclHook(sails)
{
	var roles  = [];
	var rules  = {};
	var routes = {};
	var defaultRole;
	var currentRole;
	var defaultPolicy = "allow";

	var onForbidden = function (req, res, resource)
	{
		if (req.wantsJSON)
		{
			res.status(403).json();
		}
		else
		{
			res.forbidden();
		}
	};

	var checkRouteRegEx = function (resource, routes)
	{
		var result = null;
		for (var route in routes)
		{
			if (route.indexOf(":") != -1 || route.indexOf("*") != -1)
			{
				var parts = route.split(":");
				for (var i = 1; i < parts.length - 1; i++)
				{
					parts[i] = "(.*)/";

				}
				parts[i]     = "(.*)";
				var regExStr = parts.join("");
				var regEx    = new RegExp(regExStr);
				if (regEx.test(resource))
				{
					result = routes[route];
					break;
				}
			}
		}

		return result;
	};

	var retrieveResource = function (resource)
	{
		var result = null;

		if (typeof sails.config.routes[resource] != "undefined")
		{
			result = sails.config.routes[resource];
		}
		else if (typeof rules[resource] != "undefined")
		{
			result = rules[resource];
		}
		else if (typeof routes[resource] != "undefined")
		{
			result = routes[resource];
		}
		else
		{
			result = checkRouteRegEx(resource, routes);
			if (result == null)
			{
				result = checkRouteRegEx(resource, sails.config.routes);
			}
		}
		return result;
	};

	/**
	 * ACL verification
	 * @param role to check
	 * @param resource to check
	 * @returns boolean role is allowed or not
	 */
	var isAllow = function (role, resourceName, method)
	{
		var isAllowed;
		if (role == null || role == "")
		{
			role = defaultRole;
		}

		var resource = retrieveResource(resourceName);

		if (resource == null && method != undefined)//If resource name not found just search again with the http method like "GET /"
		{
			resource = retrieveResource(method + " " + resourceName);
		}

		//No ACL define so it's the default behavior
		if (resource == null || (resource != null && typeof resource.roles == "undefined"))
		{
			isAllowed = defaultPolicy == "allow";
		}
		else
		{
			if (resource.roles.indexOf(role) == -1)
			{
				isAllowed = false;
			}
			else
			{
				isAllowed = true;
			}
		}

		return isAllowed;
	};

	/**
	 * ACL hook verification
	 * @param req
	 * @param res
	 * @param next
	 * @returns {*}
	 */
	var isRouteAllowed = function (req, res, next)
	{
		var resource = req.url;
		var role     = eval("req." + currentRole);

		if (isAllow(role, resource, req.method))
		{
			return next();
		}
		else
		{
			if (onForbidden == null)
			{
				if (req.wantsJSON)
				{
					res.status(403).json();
				}
				else
				{
					res.forbidden();
				}
			}
			else
			{
				onForbidden(req, res, resource);
			}
		}
	};

	return {
		// Run when sails loads-- be sure and call `next()`.
		initialize : function (next)
		{
			if (typeof sails.config.acl != "undefined")
			{
				if (sails.config.acl.roles == undefined)
				{
					sails.log.error("ACL need roles attribut under config/acl.js");
				}
				else
				{
					roles = sails.config.acl.roles;
				}

				if (sails.config.acl.rules != undefined)
				{
					rules = sails.config.acl.rules;
				}
				if (sails.config.acl.defaultRole == undefined)
				{
					sails.log.error("ACL need defaultRole attribut under config/acl.js");
				}
				else
				{
					defaultRole = sails.config.acl.defaultRole;
				}
				if (sails.config.acl.currentRole == undefined)
				{
					sails.log.error("ACL need currentRole attribut under config/acl.js");
				}
				else
				{
					currentRole = sails.config.acl.currentRole;
				}
				if (sails.config.acl.defaultPolicy != undefined)
				{
					defaultPolicy = sails.config.acl.defaultPolicy;
				}
				if (sails.config.acl.routes != undefined)
				{
					routes = sails.config.acl.routes;
				}
				if (sails.config.acl.onForbidden != undefined)
				{
					onForbidden = sails.config.acl.onForbidden;
				}
				// Wait for the router to be initialized
				sails.on('router:before', function ()
				{
					// Wait for the views hook to load, so that its routes get bound first
					// (including the one that mixes in res.view)
					sails.after('hook:views:loaded', function ()
					{
						// Bind your routes here
						for (var route in  sails.config.routes)
						{
							sails.router.bind(route, isRouteAllowed, null, {});
						}
						for (var route in  sails.config.acl.routes)
						{
							sails.router.bind(route, isRouteAllowed, null, {});
						}

					});
				});
				return next();
			}
			else
			{
				return next("No config found ! Check you have config/acl.js file with default config");
			}

		},
		isAllow    : function (role, resource)
		{
			return isAllow(role, resource);
		}
	};
};
