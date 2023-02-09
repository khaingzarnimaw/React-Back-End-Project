const HttpError = require('../models/http-error');
const { v4: uuidV4 } = require('uuid');
const {validationResult}=require('express-validator');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User=require('../models/user');
const { default: mongoose } = require('mongoose');




const getPlaceById=async(req, res, next) => {
    const placeId = req.params.pid; 
    let place;
    try {
       place = await Place.findById(placeId);
    }catch (err){
      const error = new HttpError(
        'Something went wrong, could not find a place.',
        500
      );
      return next(error);
    }
   
    if(!place){ 
     const error = new HttpError(
      'Could not find a place for the provided id.',
      404
      );
      return next(error);
    }
  
    res.json({place: place.toObject({getters:true})}); // => { place } => { place: place }
  };

  const getPlacesByUserId = async (req,res,next)=>{
    const userId=req.params.uid;

    // let places;
    let userWithPlaces;
    try{
      userWithPlaces = await User.findById(userId).populate('places');
    } catch(err) {
      const error = new HttpError(
        'Fetching places failed, please try again later',
        500
      );
      return next(error);
    }

    // if(!places||places.length===0){
    

    if(!userWithPlaces || userWithPlaces.places.length === 0){
        return next(new HttpError('Could not find a places for the provided user id.',404));
       }
    res.json({places:userWithPlaces.places.map(place => place.toObject({getter:true}))});
    };

    const createPlace= async (req,res,next)=>{
       const errors = validationResult(req);
       if(!errors.isEmpty()){
        
       return next( new HttpError('Invalid inputs passed,please check your data.',422)
       );
       }

        const {title,description,address,creator} = req.body;
        
        let coordinates;
        try{
          coordinates =  await getCoordsForAddress(address);
        }  catch (error){
            return  next(error);
        }
 
       

        const createdPlace = new Place(
          {
            title,
            description,
            address,
            location: coordinates,
            image:'https://www.google.com/imgres?imgurl=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F1%2F10%2FEmpire_State_Building_%2528aerial_view%2529.jpg%2F800px-Empire_State_Building_%2528aerial_view%2529.jpg&imgrefurl=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FEmpire_State_Building&tbnid=Rmci_Vo7MhgNuM&vet=12ahUKEwis4qq978H8AhUYA6YKHTuJDboQMygAegUIARDgAQ..i&docid=XfQII-lYE0auyM&w=800&h=1201&q=empire%20state%20building&ved=2ahUKEwis4qq978H8AhUYA6YKHTuJDboQMygAegUIARDgAQ',
            creator
          }
        );
        let user;
        try{
          user = await User.findById(creator);
        }catch(err){
          const error = new HttpError(
            'Creating place failed, please try again',
            500
          );
          return next(error);
        }
        if(!user){
          const error = new HttpError(
            'Could not find user for provided id',
            404
          );
          return next(error);
        }
        console.log(user);
          try{
           const sess=await mongoose.startSession();
           sess.startTransaction();
           await createdPlace.save({session:sess});
           user.places.push(createdPlace);
           await user.save({session:sess});
           await sess.commitTransaction();
          } catch (err){
            const error = new HttpError(
              'Creating place failed, please try again.',
              500
            );
            return next(error);
          }
        

        res.status(201).json({place:createdPlace});
    };

    const updatedPlace = async (req, res, next) => {
      const errors = validationResult(req);
       if(!errors.isEmpty()){
       
        return next(new HttpError('Invalid inputs passed,please check your data.',422)
        );
       }

        const {title,description} = req.body;
        const placeId = req.params.pid;

        let place;
        try {
          place = await Place.findById(placeId);
        } catch(err) {
          const error = new HttpError (
            'Something went wrong, could not update places.', 500
          );
          return next(error);
        }

        place.title = title;
        place.description = description;

        try {
          await place.save();
        } catch (err){
          const error = new HttpError(
            'Something went wrong, could not update places.', 500
          );
          return next(error);
        }

       

        res.status(200).json({place: place.toObject({getters: true})});
    };

    const deletePlace = async (req, res, next) => {
      const placeId = req.params.pid;
      
        
      let place;
      try {
        place =await  Place.findById(placeId).populate('creator');
      } catch (err) {
        const error = new HttpError(
          'Something went wrong,could not delete place.',
          500
        );
        return next (error);
      }
if(!place){
  const error = new HttpError(
    'Could not find place for this id.',
    404
  );
  return next(error);
}
      try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.remove({session:sess});
        place.creator.places.pull(place);
        await place.creator.save({session:sess});
        await sess.commitTransaction();
      }catch (err){
        const error = new HttpError(
          'Something went wrong,could not delete place.',
          500
        );
        return next (error);
      }


      res.status(200).json({message: 'Deleted place.'});
    };
    
    exports.getPlaceById=getPlaceById;
    exports.getPlacesByUserId= getPlacesByUserId;
    exports.createPlace=createPlace;
    exports.updatedPlace = updatedPlace;
    exports.deletePlace = deletePlace;