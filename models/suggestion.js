
export default (sequelize, DataTypes) => {
    const Suggestion = sequelize.define('Suggestion', {
        text: DataTypes.STRING,
    });

    return Suggestion;
};