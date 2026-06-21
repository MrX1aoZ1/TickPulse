// For centralized response handling
module.exports.sendResponse = {
	success: (res, data = {}, code = 200) =>
		res.status(code).json({ success: true, ...data }),

	error: (res, message, code = 500) =>
		res.status(code).json({ success: false, error: message })
};