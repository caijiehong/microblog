var sessionConstructed = false;

exports.get = function (req) {
    var session = req.session;

    if (!sessionConstructed) {
        var cst = session.constructor;

        cst.prototype.userInfo = function () {
            return this.user;
        };
        cst.prototype.initUser = function (username, source) {
            this.user = {
                username: username,
                source: source
            };
        };
        cst.prototype.clearUser = function () {
            this.user = null;
        };

        cst.prototype.checkVerifyCode = function (code) {
            if (!this._verifyCode || this._verifyCode != code.toLowerCase()) {
                this._verifyCode = null;
                return false
            } else {
                return true;
            }
        }
        cst.prototype.setVerifyCode = function (code) {
            this._verifyCode = code.toLowerCase();
        }
        sessionConstructed = true;
    }

    return session;
}