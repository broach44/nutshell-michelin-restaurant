import axios from 'axios';
import apiKeys from '../apiKeys.json';

const baseUrl = apiKeys.firebaseConfig.databaseURL;

const getInventory = () => new Promise((resolve, reject) => {
  axios.get(`${baseUrl}/ingredients.json`)
    .then((response) => {
      const demIngredients = response.data;
      const ingredients = [];
      Object.keys(demIngredients).forEach((fbId) => {
        demIngredients[fbId].id = fbId;
        ingredients.push(demIngredients[fbId]);
      });
      resolve(ingredients);
    })
    .catch((error) => reject(error));
});


const addIngredient = (newIngredient) => axios.post(`${baseUrl}/ingredients.json`, newIngredient);

const deleteIngredient = (ingredientId) => axios.delete(`${baseUrl}/ingredients/${ingredientId}.json`);

const updateIngredient = (ingredientId, updatedIngredientObject) => axios.put(`${baseUrl}/ingredients/${ingredientId}.json`, updatedIngredientObject);

export default {
  getInventory,
  addIngredient,
  deleteIngredient,
  updateIngredient,
};
