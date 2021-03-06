import $ from 'jquery';
import moment from 'moment';
import orderData from '../../helpers/data/orderData';
import menuData from '../../helpers/data/menuData';
import utilities from '../../helpers/utilities';
import menuIngredientData from '../../helpers/data/MenuIngredientData';
import inventory from '../../helpers/data/inventoryData';
import seatingData from '../../helpers/data/seatingData';
import employeesData from '../../helpers/data/employeesData';

import reservationsData from '../../helpers/data/reservationsData';
import './reservations.scss';
import sectionsData from '../../helpers/data/sectionsData';


const printSectionDetails = (seatingId) => {
  seatingData.getSeatingByTableId(seatingId)
    .then((seatings) => {
      utilities.printToDom('table-number', seatings.tableName);
      sectionsData.getSectionById(seatings.sectionId).then(() => {
        if (seatings.sectionId) {
          const singleSection = seatings.sectionId;
          utilities.printToDom('single-section-reservation', singleSection);
        }
      });
    })
    .catch((error) => console.error(error));
};

const printStaffDetails = (seatingId) => {
  seatingData.getSeatingByTableId(seatingId)
    .then((seatings) => {
      sectionsData.getSectionById(seatings.sectionId).then((section) => {
        employeesData.getStaffById(section.server).then((server) => {
          employeesData.getStaffById().then(() => {
            utilities.printToDom('server-spot', server.name);
            employeesData.getStaffById(section.bartender).then((bartender) => {
              utilities.printToDom('bartender-spot', bartender.name);
              employeesData.getStaffById(section.porter).then((porter) => {
                utilities.printToDom('porter-spot', porter.name);
              });
            });
          });
        });
      });
    })
    .catch((error) => console.error(error));
};

const checkAvailability = () => {
  menuData.getAllMenuItems()
    .then((menuItems) => {
      menuItems.forEach((menuItem) => {
        menuIngredientData.checkRecipesForMenuItems(menuItem.id)
          .then((recipes) => {
            recipes.forEach((recipe) => {
              inventory.getInventoryById(recipe.ingredientId)
                .then((ingredients) => {
                  ingredients.forEach((ingredient) => {
                    if (ingredient.amountStocked === 0) {
                      $(`#assmenu-${menuItem.id}`).prop('disabled', true);
                      $(`#quantity-${menuItem.id}`).attr('disabled', true);
                    }
                  });
                });
            });
          });
      });
    })
    .catch((error) => console.error(error));
};


const updateReservationByClick = (event) => {
  event.stopImmediatePropagation();
  const reservationId = $(event.target).attr('store-reservationId');
  const seatingId = $('#edit-seating-id').val();
  const partySize = $('#edit-party-size').val();
  const partySizeFormatted = parseInt(partySize, 10);
  const date = $('#edit-reserve-date').val().toString();
  const time = $('#edit-reserve-time').val().toString();
  const dateAndTime = [date, time].join(' ');
  seatingData.getSeatingByTableId(seatingId)
    .then((seatings) => {
      if (partySizeFormatted <= seatings.numOfSeats) {
        const updatedReservation = {
          seatingId,
          partySize: partySizeFormatted,
          customerName: $('#edit-customer-name').val(),
          timeStamp: dateAndTime,
          sectionId: seatings.sectionId,
        };
        reservationsData.updateResObject(reservationId, updatedReservation)
          .then((updReservation) => {
            document.forms['update-reservation-form'].reset();
            $('#editReservationModal').modal('hide');
            // eslint-disable-next-line no-use-before-define
            printReservationDetails(updReservation.id);
            printSectionDetails(seatingId);
            printStaffDetails(seatingId);
          });
      } else {
        $('#edit-reservation-party-size').removeClass('hide');
      }
    })
    .catch((error) => console.error(error));
};

const tableOption = (selectId) => {
  let domString = '<option>Choose...</option>';
  seatingData.getSeating()
    .then((seatings) => {
      seatings.forEach((seating) => {
        domString += `<option value="${seating.id}">${seating.tableName}</option>`;
      });
      utilities.printToDom(selectId, domString);
    })
    .catch((error) => console.error(error));
};

const updateResModal = (event) => {
  $('#editReservationModal').modal('show');
  const reservationId = $(event.target).closest('.card')[0].id;
  $('#update-reservation').attr('store-reservationId', reservationId);
  reservationsData.getReservationById(reservationId)
    .then((reservation) => {
      let domString = '';
      domString += `
    <form>
      <div class="form-row align-items-center">
        <div class="col-auto my-1">
          <label class="mr-sm-2" for="edit-seating-id">Table Numbers</label>
          <select class="custom-select mr-sm-2 newTableSelection" id="edit-seating-id">
          </select>
        </div>
      </div>
    </form>
    <div class="form-group">
      <label for="edit-customer-name">Customer Name</label>
      <input type="text" class="form-control" id="edit-customer-name" placeholder="Enter Customer Name">
    </div>
    <div class="form-group">
      <label for="edit-party-size">Party Size</label>
      <input type="text" class="form-control" id="edit-party-size" placeholder="Enter Party Size">
    </div>
    <div class="form-group">
      <label for="edit-reserve-date">Date</label>
      <input type="date" class="form-control" id="edit-reserve-date" placeholder="Choose Date">
    </div>
    <div class="form-group">
      <label for="edit-reserve-time">Time</label>
      <input type="time" class="form-control" id="edit-reserve-time" placeholder="Choose Time">
      <div>
        <small id="edit-reservation-party-size" class="form-text hide text-danger">Reservation party size exceeds number of seats at the table. Please pick a different table.</small>
      </div>
    </div>
      `;
      utilities.printToDom('update-reservation-form', domString);
      tableOption('edit-seating-id');
      $('#edit-seating-id').val(reservation.seatingId.split('table-').join(''));
      $('#edit-seating-id').attr('data-seatingId', reservation.seatingId);
      $('#edit-customer-name').val(reservation.customerName);
      $('#edit-party-size').val(reservation.partySize);
      $('#edit-reserve-date').val(reservation.timeStamp.split(' ')[0]);
      $('#edit-reserve-time').val(reservation.timeStamp.split(' ')[1]);
    })
    .catch((error) => console.error(error));
};

// Should time be formatted on the page for the viewer or also in the database?
const addReservationByClick = (event) => {
  event.stopImmediatePropagation();
  const seatingId = $('#seating-id').val();
  const partySize = $('#party-size').val();
  const partySizeFormatted = parseInt(partySize, 10);
  const date = $('#reserve-date').val().toString();
  const time = $('#reserve-time').val().toString();
  const dateAndTime = [date, time].join(' ');
  // const dateAndTimeFormatted = moment(dateAndTime).format('LLL');
  seatingData.getSeating()
    .then((seatings) => {
      const seatingRecord = seatings.find((x) => x.id === seatingId);
      if (partySizeFormatted <= seatingRecord.numOfSeats) {
        const newReservation = {
          seatingId,
          partySize: partySizeFormatted,
          customerName: $('#customer-name').val(),
          timeStamp: dateAndTime,
        };
        reservationsData.addReservation(newReservation)
          .then(() => {
            document.forms['reservation-form'].reset();
            $('#addReservationModal').modal('hide');
            // eslint-disable-next-line no-use-before-define
            printReservations();
            printSectionDetails(seatingId);
            printStaffDetails();
          });
      } else {
        $('#reservation-party-size').removeClass('hide');
      }
    })
    .catch();
};

const deleteReservationByClick = (event) => {
  const deleteReservation = $(event.target).hasClass('delete-reservation');
  const reservationId = $(event.target).closest('.card')[0].id;
  if (deleteReservation) {
    reservationsData.deleteReservation(reservationId)
      .then(() => {
        // eslint-disable-next-line no-use-before-define
        printReservations();
      })
      .catch((error) => console.error(error));
  }
};

const printReservationMenuModal = () => {
  menuData.getAllMenuItems()
    .then((menuItems) => {
      let domString = '';
      menuItems.forEach((menuItem) => {
        domString += `
        <div class="row">
        <div value="${menuItem.id}" class="checkbox-menu col-sm">
          <input class="form-check-input" type="checkbox" value="${menuItem.id}" data-name="${menuItem.id}" id="assmenu-${menuItem.id}">
          <label class="form-check-label" for="assmenu-${menuItem.id}">
            <h4>${menuItem.name}</h4>
          </label>
          </div>
        <div class="col-sm">
          <div class="form-group">
          <label for="quantity-${menuItem.id}"><sup>Quantity</sup></label>
          <input type="number" class="form-control" id="quantity-${menuItem.id}" value="0"></div>
        </div>
        </div>`;
      });
      utilities.printToDom('assign-menu-items-area', domString);
      checkAvailability();
    })
    .catch((error) => console.error(error));
};

const saveNewOrders = (e) => {
  e.stopImmediatePropagation();
  const reservationId = e.target.id.split('addmid-')[1];
  const checks = Array
    .from(document.querySelectorAll('input[type="checkbox"]'))
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
  checks.forEach((check) => {
    const menuId = check;
    const quantity = $(`#quantity-${menuId}`).val();
    const newOrderObj = {};
    newOrderObj.menuItemId = menuId;
    newOrderObj.reservationId = reservationId;
    for (let i = 0; i < quantity; i += 1) {
      orderData.addOrder(newOrderObj)
        .then(() => {
          $('#assign-menu-modal').modal('hide');
          // eslint-disable-next-line no-use-before-define
          printReservationDetails(reservationId);
        })
        .catch((error) => console.error(error));
    }
  });
};

const saveNewMiddle = (e) => {
  e.preventDefault();
  const reservationId = e.target.id.split('assignmenu-')[1];
  $('.save-assign-menu').attr('id', `addmid-${reservationId}`);
  $('.modal-footer').on('click', '.save-assign-menu', saveNewOrders);
};

const printReservationDetailsClick = (e) => {
  const incoming = e.target.id;
  if (incoming.includes('customer')) {
    const reservationId = e.target.id.split('customer-')[1];
    // eslint-disable-next-line no-use-before-define
    printReservationDetails(reservationId);
  } else {
    const reservationId = e.target.id;
    // eslint-disable-next-line no-use-before-define
    printReservationDetails(reservationId);
  }
};

const printOrderTotal = (reservationId) => {
  orderData.getOrdersByReservation(reservationId)
    .then((orders) => {
      if (orders !== null) {
        let totalPrice = 0;
        orders.forEach((order) => {
          menuData.getMenuItemById(order.menuItemId)
            .then((orderItem) => {
              totalPrice += orderItem.price / 100;
              const domString = `<hr></hr>
              <h4>Total: $${totalPrice.toFixed(2)}</h4>`;
              utilities.printToDom('totalContainer', domString);
            });
        });
      } else {
        console.error('please add orders');
      }
    }).catch((error) => console.error(error));
};

const getOrderInfo = (reservationId) => {
  let domString = '';
  orderData.getOrdersByReservation(reservationId)
    .then((orders) => {
      orders.forEach((order) => {
        if (order !== null) {
          menuData.getMenuItemById(order.menuItemId)
            .then((orderItem) => {
              domString += '<div class="menu-items">';
              domString += `<div class="d-flex flex-row flex-wrap justify-content-between">
            <div class="col-xs-6 justify-content-center"><h4>${orderItem.name} </h4></div>
            <div class="col-xs-6 justify-content-center"><h6>$${orderItem.price / 100}</h6></div>
            </div>`;
              domString += '</div>';
              utilities.printToDom('menuSelectionContainer', domString);
            });
        } else {
          console.error('please add orders');
        }
      });
    })
    .catch((error) => console.error(error));
};

const printReservationDetails = (reservationId) => {
  $('.card-back').removeClass('hide');
  $('.reservation-card-front').addClass('hide');
  let seatingId = '';
  reservationsData.getReservationById(reservationId)
    .then((reservation) => {
      const time = `${reservation.timeStamp}`;
      const timeFormatted = moment(time).format('LLL');
      let domString = `<div class="card reservation-single-card reservation-back-card">
      <div class="card-body reservation card-back" id="reservationback-${reservation.id}">
        <div class="card-header d-flex justify-content-between">
          <h3 id="customer-${reservation.id}">${reservation.customerName}</h3>
          <button class="go-back-button btn"><i class="fas fa-chevron-circle-left"></i></button>
        </div>
        <div class="d-flex flex-column align-items-end align-bottom reservationFont">
          <p class="card-title">Party Size — ${reservation.partySize}</p>
          <p class="card-text" id="table-number"></p>
          <p class="card-text" id="single-section-reservation"></p>
          <p id="server-spot"></p>
          <p id="bartender-spot"></p>
          <p id="porter-spot"></p>
          <p class="card-text">${timeFormatted}</p>
        </div>
        <div class="menu-items d-flex justify-content-center flex-column"> <div id="menuSelectionContainer"></div>`;

      domString += '<div id="totalContainer"></div>';
      domString += `<button id="assignmenu-${reservationId}" class="btn btn-outline-dark assign-menu" data-toggle="modal" data-target="#assign-menu-modal">
          <i class="fas fa-utensils"></i> Menu Items</button>`;
      domString += '</div></div></div>';
      seatingId = reservation.seatingId;
      utilities.printToDom('printComponent', domString);
      getOrderInfo(reservationId);
      printOrderTotal(reservationId);
      printSectionDetails(seatingId);
      printStaffDetails(seatingId);
      $('.card-body').on('click', '.go-back-button', (() => {
        $('.card-back').addClass('hide');
        // eslint-disable-next-line no-use-before-define
        printReservations();
      }));
      printReservationMenuModal();
    })
    .catch((error) => console.error(error));
};

const printReservations = () => {
  reservationsData.getReservations()
    .then((reservations) => {
      let domString = '';
      domString += `
      <div id="reservations-title" class="d-flex justify-content-between">
        <h1 id="reservations-h1">Reservations</h1>
        <button class="btn editHeight btn-secondary cudButton" id="addReservation" data-toggle="modal" data-target="#addReservationModal">Add Reservation</button>
      </div>
      `;
      domString += '<div id="reservations-section" class="d-flex flex-row flex-wrap justify-content-center">';
      reservations.forEach((reservation) => {
        const time = `${reservation.timeStamp}`;
        const timeFormatted = moment(time).format('LLL');
        domString += `
        <div class="card reservation-single-card" id="${reservation.id}">
          <div class="reservation-card-front">
            <div class="card-header">
              <h3 id="customer-${reservation.id}">${reservation.customerName}</h3>
            </div>
            <div class="d-flex justify-content-end">
              <button class="btn cudButton delete-reservation"><i class="fas fa-trash-alt"></i></button>
              <a href="#" class="cudButton btn edit-reservation"><i class="fas fa-pencil-alt"></i></a>
            </div>
          </div>
          <div class="card-body reservation card-back">
            <div class="d-flex flex-wrap flex-col align-items-end reservationFont">
              <p class="card-title">Party Size — ${reservation.partySize}</p>
              <p class="card-text">Table Number — ${reservation.seatingId.split('table-').join('')}</p>
              <p class="card-text">${timeFormatted}</p>
            </div>
          </div>
        </div>`;
      });
      domString += '</div>';
      utilities.printToDom('printComponent', domString);
      tableOption('seating-id');
      $('#printComponent').on('click', '.delete-reservation', deleteReservationByClick);
      $('.edit-reservation').click(updateResModal);
      $('#add-new-reservation').click(addReservationByClick);
      $('#update-reservation').click(updateReservationByClick);
      $('#reservations-section').on('click', '.reservation-single-card', printReservationDetailsClick);
      $('.cudButton').removeClass('hide');
      $('.card-back').addClass('hide');
    })
    .catch((error) => console.error(error));
};

export default { printReservations, saveNewMiddle };
